import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Vite 환경에서 로컬 워커를 안전하게 로드하도록 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractAllContent(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
  const pdfDocument = await loadingTask.promise;
  
  const finalOutput: string[] = [];

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const items = textContent.items as any[];
    
    // (Y, X) 좌표 기반 정렬: 
    // PDF 좌표계는 좌측 하단이 원점(0,0)입니다. 상단부터 읽으려면 Y를 내림차순으로 정렬.
    // Y축 오차가 5 미만이면 같은 줄로 취급하고 X를 오름차순 정렬.
    items.sort((a, b) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      if (Math.abs(yA - yB) < 5) {
        return a.transform[4] - b.transform[4];
      }
      return yB - yA; // Y 내림차순
    });

    // 텍스트를 줄(Line) 단위로 그룹화
    const lines: any[][] = [];
    let currentLine: any[] = [];
    let lastY = items.length > 0 ? items[0].transform[5] : 0;

    for (const item of items) {
      if (Math.abs(item.transform[5] - lastY) < 5) {
        currentLine.push(item);
      } else {
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [item];
        lastY = item.transform[5];
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    let currentTable: string[][] = [];
    let isTableMode = false;

    const processTable = () => {
      if (currentTable.length > 0) {
        let mdOutput = '\n';
        for (let i = 0; i < currentTable.length; i++) {
          const row = currentTable[i];
          const cleanRow = row.map(cell => cell.replace(/\n/g, ' ').trim());
          mdOutput += '| ' + cleanRow.join(' | ') + ' |\n';
          if (i === 0) {
            mdOutput += '| ' + row.map(() => '---').join(' | ') + ' |\n';
          }
        }
        finalOutput.push(mdOutput + '\n');
        currentTable = [];
      }
      isTableMode = false;
    };

    for (const line of lines) {
      if (line.length === 0) continue;
      
      const mergedLine: string[] = [];
      let currentStr = line[0].str;
      let lastXEnd = line[0].transform[4] + line[0].width;

      for (let i = 1; i < line.length; i++) {
        const item = line[i];
        const currentX = item.transform[4];
        
        // 텍스트 간의 X축 간격이 20보다 작으면 같은 셀(단어)로 병합
        // 20 이상 벌어지면 다른 컬럼(표 셀)으로 취급하는 휴리스틱
        if (currentX - lastXEnd < 20) {
          currentStr += item.str;
        } else {
          mergedLine.push(currentStr);
          currentStr = item.str;
        }
        lastXEnd = currentX + item.width;
      }
      mergedLine.push(currentStr);

      const cleanMerged = mergedLine.map(s => s.trim()).filter(s => s.length > 0);

      // 한 줄에 2개 이상의 독립된 텍스트 뭉치가 떨어져 있다면 표(Table)의 행으로 간주
      if (cleanMerged.length > 1) {
        currentTable.push(cleanMerged);
        isTableMode = true;
      } else {
        if (isTableMode) {
          processTable();
        }
        if (cleanMerged.length === 1) {
          let text = cleanMerged[0];
          if (text) {
            // "제 n 조(...)" 정규식 마크다운 헤더 변환
            text = text.replace(/(제\s?\d+\s?조\(.*?\))/g, '\n\n# $1');
            finalOutput.push(text);
          }
        }
      }
    }
    // 페이지 끝날 때 남은 테이블 처리
    if (isTableMode) {
      processTable();
    }
  }

  return finalOutput.join('\n\n');
}
