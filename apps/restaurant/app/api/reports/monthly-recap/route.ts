import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, enforce } from '@/lib/auth/supabase-server';

export async function GET(request: NextRequest) {
  const denied = await enforce('reports.read'); if (denied) return denied;
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // format: 2026-04

    if (!month) {
      return NextResponse.json({ error: 'month parameter required (YYYY-MM)' }, { status: 400 });
    }

    const startDate = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    // 1. Daily entries for the month
    const { data: entries } = await supabase
      .from('daily_entries')
      .select('*')
      .gte('entry_date', startDate)
      .lte('entry_date', endDate)
      .order('entry_date');

    const dailyEntries = entries || [];

    // 2. Aggregate daily entries
    const totals = {
      revenue_card: 0,
      revenue_cash: 0,
      revenue_transfer: 0,
      total_revenue: 0,
      expense_cash: 0,
      expense_card_pro: 0,
      expense_tpe: 0,
      total_expenses: 0,
      withdrawal_pro: 0,
      withdrawal_perso: 0,
      total_withdrawals: 0,
      solde_theorique: 0,
    };

    let bestDay = { date: '', revenue: 0 };

    for (const e of dailyEntries) {
      totals.revenue_card += Number(e.revenue_card) || 0;
      totals.revenue_cash += Number(e.revenue_cash) || 0;
      totals.revenue_transfer += Number(e.revenue_transfer) || 0;
      totals.total_revenue += Number(e.total_revenue) || 0;
      totals.expense_cash += Number(e.expense_cash) || 0;
      totals.expense_card_pro += Number(e.expense_card_pro) || 0;
      totals.expense_tpe += Number(e.expense_tpe) || 0;
      totals.total_expenses += Number(e.total_expenses) || 0;
      totals.withdrawal_pro += Number(e.withdrawal_pro) || 0;
      totals.withdrawal_perso += Number(e.withdrawal_perso) || 0;
      totals.total_withdrawals += Number(e.total_withdrawals) || 0;
      totals.solde_theorique += Number(e.solde_theorique) || 0;

      const rev = Number(e.total_revenue) || 0;
      if (rev > bestDay.revenue) {
        bestDay = { date: e.entry_date, revenue: rev };
      }
    }

    // 3. Salary records for the month
    const { data: salaries } = await supabase
      .from('salary_records')
      .select('total')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`);

    const totalSalaries = (salaries || []).reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    // 4. Vendor debts for the month
    const { data: vendorDebts } = await supabase
      .from('vendor_transactions')
      .select('type, amount')
      .gte('date', startDate)
      .lte('date', endDate);

    let totalVendorDebts = 0;
    let totalVendorPayments = 0;
    for (const t of vendorDebts || []) {
      if (t.type === 'debt') totalVendorDebts += Number(t.amount) || 0;
      if (t.type === 'payment') totalVendorPayments += Number(t.amount) || 0;
    }

    // 5. Compute metrics
    const daysWorked = dailyEntries.length;
    const avgDailyRevenue = daysWorked > 0 ? totals.total_revenue / daysWorked : 0;
    const avgDailyExpense = daysWorked > 0 ? totals.total_expenses / daysWorked : 0;

    return NextResponse.json({
      month,
      totals,
      metrics: {
        daysWorked,
        avgDailyRevenue,
        avgDailyExpense,
        bestDay,
        totalSalaries,
        totalVendorDebts,
        totalVendorPayments,
        netResult: totals.solde_theorique - totalSalaries,
      },
      entries: dailyEntries,
    });
  } catch (error) {
    console.error('Monthly recap error:', error);
    return NextResponse.json({ error: 'Failed to compute monthly recap' }, { status: 500 });
  }
}
