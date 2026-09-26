import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitationId');
  const status = url.searchParams.get('status') || 'all';
  const q = (url.searchParams.get('q') || '').trim();
  const deviceId = url.searchParams.get('deviceId');
  const categoryId = url.searchParams.get('categoryId');

  const guestWhere = { invitation: { userId: s.user.id } };
  if (invitationId) guestWhere.invitationId = invitationId;
  if (q) guestWhere.name = { contains: q };
  if (categoryId) guestWhere.categoryId = categoryId;

  const guests = await prisma.guest.findMany({
    where: guestWhere,
    include: {
      category: { select: { name: true } },
      checkIns: {
        where: deviceId ? { deviceId } : undefined,
        include: { device: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = [];
  const base = new URL(request.url).origin;
  for (const g of guests) {
    const catName = g.category?.name || g.categoryText || '-';
    if (g.checkIns.length > 0) {
      for (const ci of g.checkIns) {
        rows.push([
          g.name,
          catName,
          ci.count || 1,
          'Checked-in',
          ci.createdAt.toISOString().replace('T', ' ').substring(0, 19),
          ci.operatorName || '-',
          ci.device?.name || '-',
          ci.selfieUrl ? (ci.selfieUrl.startsWith('http') ? ci.selfieUrl : base + ci.selfieUrl) : '-',
        ]);
      }
    } else {
      rows.push([g.name, catName, 0, 'Not Checked In', '-', '-', '-', '-']);
    }
  }

  const filtered = rows.filter(r => status === 'all' || (status === 'CHECKED_IN' ? r[3] === 'Checked-in' : r[3] === 'Not Checked In'));

  const headers = ['Guest Name', 'Guest Category', 'Number of Attendees', 'Check-in Status', 'Check-in Time', 'Operator', 'iPad Code', 'Selfie Photo'];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...filtered]);
  ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `attendance-${new Date().toISOString().substring(0, 10)}.xlsx`;
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
