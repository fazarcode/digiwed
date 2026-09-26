'use client';
import { Heart } from 'lucide-react';

// Shared presentational hero for the Photo Moments landing — used by both the public
// page and the dashboard live preview (Req 9A) so there's a single source of truth.
export default function MomentsHero({ invitation }) {
  const eventName = [invitation.brideName, invitation.groomName].filter(Boolean).join(' & ') || 'our wedding';
  const title = invitation.momentsTitle || 'Event Moments';
  const message = invitation.momentsMessage || 'Share the memories you captured today. Every photo will be treasured by the couple.';
  return (
    <div>
      {invitation.coverImage && (
        <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${invitation.coverImage})` }} data-testid="moments-cover" />
      )}
      <div className="text-center space-y-2 px-4 pt-8">
        <div className="inline-flex items-center gap-2 text-primary text-xs uppercase tracking-widest">
          <Heart className="h-3 w-3" fill="currentColor" />{title}
        </div>
        <h1 className="font-serif text-3xl font-bold" data-testid="moments-event-name">{eventName}</h1>
        {invitation.venue && <p className="text-sm text-muted-foreground">{invitation.venue}</p>}
        <p className="text-sm text-muted-foreground pt-2 max-w-xl mx-auto" data-testid="moments-message">{message}</p>
      </div>
    </div>
  );
}
