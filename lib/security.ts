import { z } from "zod";
const requests=new Map<string,{count:number;reset:number}>(); export function rateLimit(key:string,limit=60,windowMs=60_000){const now=Date.now(),current=requests.get(key);if(!current||current.reset<=now){requests.set(key,{count:1,reset:now+windowMs});return true;}if(current.count>=limit)return false;current.count++;return true;}
export function body<T extends z.ZodTypeAny>(schema:T,input:unknown):z.infer<T>{return schema.parse(input);}
export const projectIdSchema=z.string().uuid();
