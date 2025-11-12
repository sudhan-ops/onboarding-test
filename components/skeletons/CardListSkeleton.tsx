import React from 'react';
import Skeleton from '../ui/Skeleton';

const CardListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
    return (
        <div className="space-y-2.5">
            {Array.from({ length: count }).map((_, i) => (
                 <div key={i} className="bg-[#243524] p-3 rounded-xl flex gap-4 items-start border border-transparent">
                    <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                    <div className="flex-grow space-y-2 mt-1">
                        <div className="flex justify-between items-start gap-2">
                           <Skeleton className="h-4 w-1/2" />
                           <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-1/3" />
                         <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-xs">
                             <Skeleton className="h-3 w-20" />
                             <Skeleton className="h-3 w-20" />
                             <Skeleton className="h-3 w-20" />
                             <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
export default CardListSkeleton;
