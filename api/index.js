export default async function handler(req, res) {
  const apiKey = process.env.FACEIT_API_KEY;
  // Используем твой точный ID игрока напрямую
  const playerId = "cbfa4eb1-c67d-472d-beea-2fb5e56d73f4"; 

  try {
    // 1. Получаем профиль по ID
    const playerRes = await fetch(`https://open.faceit.com/data/v4/players/${playerId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!playerRes.ok) return res.status(200).send("Ошибка: Не удалось загрузить профиль игрока");
    const playerData = await playerRes.json();
    
    const elo = playerData.games.cs2?.faceit_elo || playerData.games.csgo?.faceit_elo || "N/A";

    // 2. Получаем историю последних 20 матчей
    const historyRes = await fetch(`https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=20`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const historyData = await historyRes.json();

    let wins = 0;
    let losses = 0;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (historyData.items) {
      for (const match of historyData.items) {
        if (match.started_at * 1000 >= startOfDay) {
           let playerFaction = null;
           if (match.teams?.faction1?.players?.some(p => p.player_id === playerId)) {
               playerFaction = 'faction1';
           } else {
               playerFaction = 'faction2';
           }

           if (match.results?.winner === playerFaction) {
               wins++;
           } else {
               losses++;
           }
        }
      }
    }

    const totalGames = wins + losses;
    const eloDiff = (wins * 25) - (losses * 25);
    const sign = eloDiff > 0 ? "+" : "";

    const resultText = `Elo: ${elo} | Сегодня: ${wins}W - ${losses}L (${totalGames} игр) | Итог: ${sign}${eloDiff}`;
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(resultText);

  } catch (error) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send("Ошибка при подключении к серверам FACEIT");
  }
}
