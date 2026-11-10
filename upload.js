import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let fileContent = fs.readFileSync('gkb.csv', 'utf8');
fileContent = fileContent.replace(/^\uFEFF/, '');

// Разбиваем на строки
const lines = fileContent.split(/\r?\n/);

async function upload() {
  let updatedCount = 0;
  let newCount = 0;
  let skipped = 0;

  console.log(`Прочитано строк: ${lines.length}`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Пропускаем пустые строки и строки с "Со знач"
    if (!line || line.includes('Со знач')) {
      skipped++;
      continue;
    }

    // Разбиваем по точке с запятой
    const row = line.split(';');
    
    // Если колонок меньше 3, значит это мусорная строка
    if (row.length < 3) {
      skipped++;
      continue;
    }

    // 1. Штрих-код — первая колонка. Убираем кавычки, пробелы и апострофы
    let shtrihkod = row[0].replace(/['"\s]/g, '');
    
    // Если после очистки остались только буквы (например, "Итого"), пропускаем
    if (!shtrihkod || isNaN(Number(shtrihkod))) {
      skipped++;
      continue;
    }

    // 2. Название — вторая колонка. Убираем кавычки
    const nazvanie = row[1]?.replace(/['"]/g, '').trim();
    
    // 3. Единица измерения
    const edIzm = row[2]?.trim() || 'м²';

    // 4. Остаток. Ищем колонку с числом (обычно это 5-я, индекс 4)
    // На всякий случай перебираем все колонки с конца, чтобы найти число с запятой
    let ostatok = 0;
    for (let j = row.length - 1; j >= 3; j--) {
        let cell = row[j].trim();
        // Если ячейка похожа на число (есть цифры и запятая/точка)
        if (/^[\d.,]+$/.test(cell)) {
            ostatok = parseFloat(cell.replace(',', '.')) || 0;
            break;
        }
    }

    // Если не нашли название, пропускаем
    if (!nazvanie) {
      skipped++;
      continue;
    }

    // Для проверки выведем первый попавшийся товар
    if (newCount === 0 && updatedCount === 0) {
       console.log('Пример товара:', { shtrihkod, nazvanie: nazvanie.substring(0, 30) + '...', ostatok });
    }

    const { data: existing } = await supabase.from('spravochnik').select('id').eq('shtrihkod', shtrihkod).single();

    if (existing) {
      await supabase.from('spravochnik').update({ ostatok, nazvanie, ed_izm: edIzm }).eq('id', existing.id);
      updatedCount++;
    } else {
      await supabase.from('spravochnik').insert([{ shtrihkod, nazvanie, ed_izm: edIzm, ostatok }]);
      newCount++;
    }
  }

  console.log(`Готово! Обновлено: ${updatedCount}, Добавлено: ${newCount}, Пропущено: ${skipped}`);
}

upload();