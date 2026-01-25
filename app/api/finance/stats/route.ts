import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get overall stats
    let query = supabase
      .from('sales_items')
      .select('selling_price, quantity, profit, category, sale_date, product_name');

    if (startDate) {
      query = query.gte('sale_date', startDate);
    }
    if (endDate) {
      query = query.lte('sale_date', endDate);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Stats query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate stats
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalItems = 0;
    const categoryStats: Record<string, { revenue: number; count: number; profit: number }> = {};
    const dailyStats: Record<string, { revenue: number; count: number; profit: number }> = {};

    for (const item of items || []) {
      const revenue = (item.selling_price || 0) * (item.quantity || 1);
      const profit = (item.profit || 0) * (item.quantity || 1);

      totalRevenue += revenue;
      totalProfit += profit;
      totalItems += item.quantity || 1;

      // Category stats
      const cat = item.category || 'Other';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { revenue: 0, count: 0, profit: 0 };
      }
      categoryStats[cat].revenue += revenue;
      categoryStats[cat].count += item.quantity || 1;
      categoryStats[cat].profit += profit;

      // Daily stats
      const date = item.sale_date;
      if (date) {
        if (!dailyStats[date]) {
          dailyStats[date] = { revenue: 0, count: 0, profit: 0 };
        }
        dailyStats[date].revenue += revenue;
        dailyStats[date].count += item.quantity || 1;
        dailyStats[date].profit += profit;
      }
    }

    // Get top products
    const productStats: Record<string, { revenue: number; count: number }> = {};
    for (const item of items || []) {
      const name = item.product_name || 'Unknown';
      if (!productStats[name]) {
        productStats[name] = { revenue: 0, count: 0 };
      }
      productStats[name].revenue += (item.selling_price || 0) * (item.quantity || 1);
      productStats[name].count += item.quantity || 1;
    }

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Get categories list
    const { data: categories } = await supabase
      .from('sales_items')
      .select('category')
      .not('category', 'is', null);

    const uniqueCategories = [...new Set((categories || []).map(c => c.category))].filter(Boolean);

    // Get recent imports
    const { data: imports } = await supabase
      .from('sales_imports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalProfit,
        totalItems,
        averageOrderValue: totalItems > 0 ? totalRevenue / totalItems : 0
      },
      categoryStats: Object.entries(categoryStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue),
      dailyStats: Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topProducts,
      categories: uniqueCategories,
      recentImports: imports || []
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
