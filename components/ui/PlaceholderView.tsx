import React from 'react';

const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-page rounded-lg min-h-[400px]">
        <h3 className="text-xl font-semibold text-primary-text mb-2">{title}</h3>
        <p className="text-muted max-w-sm">
            Configuration for this section will be available here. The form details will be provided in a future update.
        </p>
    </div>
);

export default PlaceholderView;