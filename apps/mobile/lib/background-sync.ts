import * as BackgroundFetch from "expo-background-fetch"; import * as TaskManager from "expo-task-manager"; import { syncQueue } from "@/lib/offline";
export const BACKGROUND_SYNC_TASK="foxscan-background-sync";
TaskManager.defineTask(BACKGROUND_SYNC_TASK,async()=>{try{const result=await syncQueue();return result.offline?BackgroundFetch.BackgroundFetchResult.NoData:BackgroundFetch.BackgroundFetchResult.NewData;}catch{return BackgroundFetch.BackgroundFetchResult.Failed;}});
export async function registerBackgroundSync(){return BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK,{minimumInterval:15*60,stopOnTerminate:false,startOnBoot:true});}
