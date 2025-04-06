import { OVERTIME_HOURS_IN_THE_LAST_WEEK } from "./constants";

/**
 * TSVファイルを作成する
 * 
 * @param inputList 対象一覧
 * @returns tsvファイル（バッファ）
 */
export function createTsv(inputList): Buffer<ArrayBuffer> {
    const exportList: string[][] = [];

    for(const input of inputList){
        if(input[0] === OVERTIME_HOURS_IN_THE_LAST_WEEK){
            exportList.push([]);
            exportList.push(input);
            exportList.push([]);
            continue;
        }
        const name = input[0].substring(6);
        const overTimes = input[1].split(" ");
        const reason = input[2];
        exportList.push([name, overTimes[0], overTimes[1], "\"" + reason + "\""]);

    }
    // メモリ上でTSVデータを作成
    const tsvContent = exportList.map(row => row.join('\t')).join('\n');
    return Buffer.from(tsvContent, 'utf-8');
}
