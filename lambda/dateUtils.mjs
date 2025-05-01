
/** 
 * 先月の値を取得する 
 * 値が1月(01)の場合、12を返却する
 */
export function converteLastMonth(thisMonth) {
    if(thisMonth === '01'){
        return '12';
    }
    return String(Number(thisMonth) - 1).padStart(2, '0');
}

/** 
 * 去年の値を取得する 
 */
export function converteLastYear(thisYear) {
    return String(Number(thisYear) - 1);
}

// 土日祝日を省くための関数
export function getNextBusinessDay(date, daysToAdd) {
    let nextDay = new Date(date);
    let addedDays = 0;
    const holidays = getHolidays(nextDay.getFullYear()); // 当年の祝日を取得

    // 指定された日数分、土日祝日を除く営業日をカウント
    while (addedDays < daysToAdd) {
        nextDay.setDate(nextDay.getDate() + 1); // 翌日を設定
        if (nextDay.getDay() !== 0 && nextDay.getDay() !== 6 && !isHoliday(nextDay, holidays)) {
            addedDays++; // 土日祝日でない場合のみカウント
        }
    }

    return nextDay;
}

// 祝日を自動計算する関数
function getHolidays(year) {
    return [
        new Date(year, 0, 1), // 元日 (1月1日)
        getNthWeekdayOfMonth(year, 1, 2, 1), // 成人の日 (1月第2月曜日)
        new Date(year, 2, 11), // 建国記念の日 (2月11日)
        new Date(year, 2, 23), // 天皇誕生日 (2月23日)
        getVernalEquinoxDay(year), // 春分の日 (年による)
        new Date(year, 3, 29), // 昭和の日 (4月29日)
        new Date(year, 4, 3), // 憲法記念日 (5月3日)
        new Date(year, 4, 4), // みどりの日 (5月4日)
        new Date(year, 4, 5), // こどもの日 (5月5日)
        getNthWeekdayOfMonth(year, 7, 3, 1), // 海の日 (7月第3月曜日)
        getNthWeekdayOfMonth(year, 8, 2, 1), // 敬老の日 (9月第3月曜日)
        getAutumnEquinoxDay(year), // 秋分の日 (年による)
        getNthWeekdayOfMonth(year, 9, 2, 1), // 体育の日 (10月第2月曜日)
        new Date(year, 10, 3), // 文化の日 (11月3日)
        new Date(year, 10, 23) // 勤労感謝の日 (11月23日)
    ];
}

// 月の第X月曜日を取得する関数（成人の日、海の日、敬老の日、体育の日に使用）
function getNthWeekdayOfMonth(year, month, nth, weekday) {
    let date = new Date(year, month, 1);
    let count = 0;
    while (date.getDay() !== weekday || ++count < nth) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

// 春分の日を取得する関数（概算）
function getVernalEquinoxDay(year) {
    const day = Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
    return new Date(year, 2, day);
}

// 秋分の日を取得する関数（概算）
function getAutumnEquinoxDay(year) {
    const day = Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4);
    return new Date(year, 8, day);
}

// 祝日かどうかを判定する関数
function isHoliday(date, holidays) {
    return holidays.some(holiday => 
        date.getFullYear() === holiday.getFullYear() &&
        date.getMonth() === holiday.getMonth() &&
        date.getDate() === holiday.getDate()
    );
}
