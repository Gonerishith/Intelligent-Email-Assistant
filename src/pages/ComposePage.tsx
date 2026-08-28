import React from 'react';
import { ComposeForm } from '../components/compose/ComposeForm';

export const ComposePage: React.FC = () => {
  return (
    <div id="compose-page" className="h-full overflow-y-auto bg-zinc-50">
      <ComposeForm />
    </div>
  );
};
