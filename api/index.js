export default async function handler(req, res) {
  const { nick } = req.query;
  const apiKey = process.env.FACEIT_API_KEY;

  if (!nick) {
    return res.status(200).send("Укажите ник: ?nick=ВАШ_НИК");
  }

  try {
    // 1. Получаем базовый профиль и текущее Эло
    const playerRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${nick}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!playerRes.ok) return res.status(200).send(`Игрок ${nick} не найден`);
    const playerData = await playerRes.json();
    
    const playerId = playerData.player_id;
    const elo = playerData.games.cs2?.faceit_elo || "N/A";

    // 2. Получаем историю последних 20 матчей
    const historyRes = await fetch(`https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=20`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const historyData = await historyRes.json();

    let wins = 0;
    let losses = 0;

    // Вычисляем начало текущих суток
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (historyData.items) {
      for (const match of historyData.items) {
        // match.started_at отдается в секундах, переводим в миллисекунды
        if (match.started_at * 1000 >= startOfDay) {
           
           // Ищем, в какой команде был игрок
           let playerFaction = null;
           if (match.teams?.faction1?.players?.some(p => p.player_id === playerId)) {
               playerFaction = 'faction1';
           } else {
               playerFaction = 'faction2';
           }

           // Проверяем победителя
           if (match.results?.winner === playerFaction) {
               wins++;
           } else {
               losses++;
           }
        }
      }
    }

    const totalGames = wins + losses;
    
    // Официальный API не отдает точное изменение Эло в истории матчей. 
    // Считаем примерно: в среднем +/- 25 Эло за игру.
    const eloDiff = (wins * 25) - (losses * 25);
    const sign = eloDiff > 0 ? "+" : "";

    // 3. Формируем итоговый текст для вывода в чат
    const resultText = `Elo: ${elo} | Сегодня: ${wins}W - ${losses}L (${totalGames} игр) | Итог: ${sign}${eloDiff}`;
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(resultText);

  } catch (error) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send("Ошибка при подключении к серверам FACEIT");
  }
}
