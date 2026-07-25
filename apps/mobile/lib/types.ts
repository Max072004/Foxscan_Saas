export type Role="ADMIN"|"CLIENT"|"CONSULTANT"|"MANUFACTURER"|"CONTRACTOR";
export type Activity={id:string;projectId:string;name:string;status:string;progress:number;plannedStart:string;plannedEnd:string;dependencyIds:string[];durationDays?:number;paymentValue?:number};
export type Project={id:string;name:string;address:string;status:string;contractValue:number;startDate:string;endDate:string};
export type AppNotification={id:string;title:string;body:string;createdAt:string;readAt?:string};
export type QueueOperation={id:string;method:"POST"|"PATCH";path:string;body:unknown;createdAt:string;attempts:number};
