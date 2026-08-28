import React, { useState, useEffect } from 'react';
import { Mail, Sparkles, Inbox } from 'lucide-react';
import { EmailList } from '../components/inbox/EmailList';
import { EmailDetail } from '../components/inbox/EmailDetail';
import { useEmails } from '../context/EmailContext';

export const InboxPage: React.FC = () => {
  const { selectedEmail, selectEmail } = useEmails();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Sync mobile view state when selection changes
  useEffect(() => {
    if (selectedEmail && window.innerWidth < 1024) {
      setMobileDetailOpen(true);
    }
  }, [selectedEmail]);

  const handleBackToMobileList = () => {
    setMobileDetailOpen(false);
  };

  return (
    <div id="inbox-dashboard" className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Email List Column (Full width on mobile when list is active, left column on desktop) */}
        <div
          className={`h-full w-full lg:w-[42%] xl:w-[38%] shrink-0 ${
            mobileDetailOpen ? 'hidden lg:block' : 'block'
          }`}
        >
          <EmailList onSelectEmailMobile={() => setMobileDetailOpen(true)} />
        </div>

        {/* Email Reading Detail Column */}
        <div
          className={`h-full flex-1 bg-white overflow-hidden ${
            mobileDetailOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          {selectedEmail ? (
            <EmailDetail
              email={selectedEmail}
              onBackMobile={handleBackToMobileList}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-1">
                Select an email to view
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm">
                Choose a conversation from the inbox list to read full message details, review AI summaries, and draft quick replies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
