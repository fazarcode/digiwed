import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import MessageTemplateClient from "@/components/dashboard/message-template-client";
import MessageTemplatesManager from "@/components/dashboard/message-templates-manager";
import { DEFAULT_WHATSAPP_TEMPLATE } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function MessageTemplatePage() {
  const s = await auth();
  const user = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { whatsappTemplate: true },
  });

  const invitations = await prisma.invitation.findMany({
    where: { userId: s.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      brideName: true,
      groomName: true,
      customDomain: true,
      subdomain: true,

      // ✅ PERBAIKAN: Cukup panggil true karena events bertipe Json (Scalar)
      events: true,

      guests: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { category: { select: { name: true } } },
      },
    },
  });

  const data = invitations.map((i) => {
    // Pastikan events dibaca sebagai array dari Json
    const eventsArray = Array.isArray(i.events) ? i.events : [];
    const mainEvent = eventsArray.length > 0 ? eventsArray[0] : null;

    return {
      id: i.id,
      slug: i.slug,
      brideName: i.brideName,
      groomName: i.groomName,
      customDomain: i.customDomain,
      subdomain: i.subdomain,

      // Ambil properti dari object JSON event tersebut
      weddingDate: mainEvent?.date
        ? new Date(mainEvent.date).toISOString()
        : null,
      weddingTime: mainEvent?.time || null,
      venue: mainEvent?.venue || null,
      address: mainEvent?.address || null,

      sampleGuest: i.guests[0]
        ? {
            name: i.guests[0].name,
            token: i.guests[0].token,
            quota: i.guests[0].quota,
            category:
              i.guests[0].category?.name || i.guests[0].categoryText || "",
          }
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">
          WhatsApp Message Template
        </h1>
        <p className="text-muted-foreground mt-1">
          Customize the message sent to your guests. Use placeholders to
          auto-fill each guest's details.
        </p>
      </div>
      <MessageTemplateClient
        initialTemplate={user?.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE}
        defaultTemplate={DEFAULT_WHATSAPP_TEMPLATE}
        isCustom={!!user?.whatsappTemplate}
        invitations={data}
      />
      <div className="pt-6 mt-6 border-t border-primary/10">
        <MessageTemplatesManager />
      </div>
    </div>
  );
}
