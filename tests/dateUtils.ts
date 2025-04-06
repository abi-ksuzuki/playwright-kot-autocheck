
/*
  週の幅を作成する
*/
export function convertWeek(weekAgo: number): string {
    const lastStartWeek = formatDate(getWeekAgo(weekAgo, 0), "/");
    const lastEndWeek = formatDate(getWeekAgo(weekAgo, 6), "/");
    return lastStartWeek + " 〜 " + lastEndWeek;
}

/*
  日付のフォーマット変換
*/
export function formatDate(date: Date, sep=""): string {
    const yyyy = date.getFullYear();
    const mm = ('00' + (date.getMonth()+1)).slice(-2);
    const dd = ('00' + date.getDate()).slice(-2);
  
    return `${yyyy}${sep}${mm}${sep}${dd}`;
}

/*
  年月のフォーマット変換
*/
export function formatMonth(date: Date, sep=""): string {
    const yyyy = date.getFullYear();
    const mm = ('00' + (date.getMonth()+1)).slice(-2);

    return `${yyyy}${sep}${mm}`;
}

/*
  時間を変換する（0.0 -> 0:00）
*/
export function formatTime(time: number): string{

    const convTime = String(time);
    if(convTime.includes(".")){
        return convTime.padEnd(convTime.indexOf(".") + 3, "0").replace(".", ":");
    }else{
        return convTime + ":00";
    }
}

/*
  指定した数週間前の日付を取得する

  weekAgo:何週間前を取得したいか（1週間前：1）
  dayOfWeek:何曜日を取得したいか（日曜日：0、月曜日：1、…土曜日：6
*/
export function getWeekAgo(weekAgo: number, dayOfWeek: number): Date {
    const today = new Date(); // 現在の日付を取得
    const nowDayOfWeek = today.getDay(); // 今日の曜日を取得 (0: 日曜日, 1: 月曜日, ...)
    
    // 先週の日曜日は今日から (日曜日の数値 + 7) 引いた日付を取得
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - nowDayOfWeek - (7 * weekAgo) + dayOfWeek);
}

/*
  指定した数月前の月初を取得する
*/
export function getMonthAgo(weekAgo: number): Date {
    const date = new Date(); // 現在の日付を取得
    return new Date(date.getFullYear(), date.getMonth() - weekAgo, 1);
}