import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';

// GET - Fetch drivers, vehicles, trips, or staff with transport settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'drivers';

    if (type === 'drivers') {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('first_name');

      if (error) throw error;
      return NextResponse.json({ drivers: data });
    }

    if (type === 'vehicles') {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('name');

      if (error) throw error;
      return NextResponse.json({ vehicles: data });
    }

    if (type === 'trips') {
      const startDate = searchParams.get('start');
      const endDate = searchParams.get('end');
      const tripType = searchParams.get('tripType');

      let query = supabase
        .from('transport_trips')
        .select(`
          *,
          driver:drivers(*),
          vehicle:vehicles(*),
          passengers:transport_trip_passengers(
            id,
            staff_id,
            staff:staff_members(id, first_name, last_name, department)
          )
        `)
        .order('date')
        .order('scheduled_time');

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      if (tripType && tripType !== 'all') query = query.eq('trip_type', tripType);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ trips: data });
    }

    if (type === 'staff-transport') {
      // Get staff members with transport preferences
      const department = searchParams.get('department');

      let query = supabase
        .from('staff_members')
        .select(`
          id, first_name, last_name, email, phone,
          department, transport_pickup, transport_dropoff, is_active,
          staff_type:staff_types(id, name, color),
          schedule_type, schedule_config
        `)
        .eq('is_active', true)
        .order('first_name');

      if (department && department !== 'all') {
        query = query.eq('department', department);
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ staff: data });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Transport GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// POST - Create new driver, vehicle, or trip
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'driver') {
      const { data: result, error } = await supabase
        .from('drivers')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, driver: result });
    }

    if (type === 'vehicle') {
      const { data: result, error } = await supabase
        .from('vehicles')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, vehicle: result });
    }

    if (type === 'trip') {
      const { passengers, ...tripData } = data;

      // Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('transport_trips')
        .insert(tripData)
        .select()
        .single();

      if (tripError) throw tripError;

      // Add passengers if provided
      if (passengers && Array.isArray(passengers) && passengers.length > 0) {
        const passengerRecords = passengers.map((staffId: string) => ({
          trip_id: trip.id,
          staff_id: staffId
        }));

        const { error: passengersError } = await supabase
          .from('transport_trip_passengers')
          .insert(passengerRecords);

        if (passengersError) throw passengersError;
      }

      return NextResponse.json({ success: true, trip });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Transport POST error:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

// PATCH - Update driver, vehicle, trip, or staff transport settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { type, id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (type === 'driver') {
      const { data: result, error } = await supabase
        .from('drivers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, driver: result });
    }

    if (type === 'vehicle') {
      const { data: result, error } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, vehicle: result });
    }

    if (type === 'trip') {
      const { passengers, ...tripData } = data;

      // Update trip data
      const { data: trip, error: tripError } = await supabase
        .from('transport_trips')
        .update(tripData)
        .eq('id', id)
        .select()
        .single();

      if (tripError) throw tripError;

      // Update passengers if provided
      if (passengers !== undefined) {
        // Remove existing passengers
        await supabase
          .from('transport_trip_passengers')
          .delete()
          .eq('trip_id', id);

        // Add new passengers
        if (Array.isArray(passengers) && passengers.length > 0) {
          const passengerRecords = passengers.map((staffId: string) => ({
            trip_id: id,
            staff_id: staffId
          }));

          const { error: passengersError } = await supabase
            .from('transport_trip_passengers')
            .insert(passengerRecords);

          if (passengersError) throw passengersError;
        }
      }

      return NextResponse.json({ success: true, trip });
    }

    if (type === 'staff-transport') {
      // Update staff transport preferences
      const { data: result, error } = await supabase
        .from('staff_members')
        .update({
          transport_pickup: data.transport_pickup,
          transport_dropoff: data.transport_dropoff,
          department: data.department
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, staff: result });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Transport PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

// DELETE - Remove driver, vehicle, or trip
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID required' }, { status: 400 });
    }

    const tableMap: Record<string, string> = {
      'driver': 'drivers',
      'vehicle': 'vehicles',
      'trip': 'transport_trips'
    };

    const table = tableMap[type];
    if (!table) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transport DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
