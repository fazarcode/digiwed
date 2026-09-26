import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { auth } from '@/auth';

export async function GET() {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const headers = ['Name', 'Phone', 'GuestType', 'GuestCount', 'Gender', 'GuestSide', 'Category'];
  const example = [
    ['John Doe',        '+62 812-3456-7890', 'INDIVIDUAL', 1, 'MALE',   'GROOM',  'Family'],
    ['Jane Smith',      '+62 812-1111-2222', 'INDIVIDUAL', 1, 'FEMALE', 'BRIDE',  'Friend'],
    ['Smith Family',    '+62 812-3333-4444', 'GROUP',      4, 'OTHER',  'BOTH',   'VIP'],
    ['Parents of Bride','+62 812-5555-6666', 'GROUP',      6, 'OTHER',  'PARENTS','Family'],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  ws['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Guests');

  // Notes sheet with valid values
  const notes = [
    ['Field', 'Allowed Values'],
    ['GuestType', 'INDIVIDUAL, GROUP'],
    ['Gender', 'MALE, FEMALE, OTHER'],
    ['GuestSide', 'GROOM, BRIDE, BOTH, PARENTS'],
    ['Category', 'Any existing category name (case-insensitive). Unknown names are stored as free text.'],
    ['GuestCount', 'Positive integer. For INDIVIDUAL, forced to 1 at check-in. For GROUP, this is the expected size.'],
  ];
  const nws = XLSX.utils.aoa_to_sheet(notes);
  nws['!cols'] = [{ wch: 14 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, nws, 'Instructions');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="guest-import-template.xlsx"',
    },
  });
}
