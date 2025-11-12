
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon }) => (
    <div className="bg-card p-4 rounded-2xl flex items-center col-span-1">
        <div className="p-3 rounded-full bg-accent-light mr-4">
            <Icon className="h-6 w-6 text-accent-dark" />
        </div>
        <div>
            <p className="text-sm text-muted font-medium">{title}</p>
            <p className="text-2xl font-bold text-primary-text">{value}</p>
        </div>
    </div>
);

export default React.memo(StatCard);