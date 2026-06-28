export default async function handler(req, res) {
  const apiKey = process.env.FACEIT_API_KEY;
  const playerId = "cbfa4eb1-c67d-472d-beea-2fb5e56d73f4"; 

  try {
    const playerRes = await fetch(`https://open.faceit.com/data/v4/players/${playerId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!playerRes.ok) return res.status(200).send("Ошибка: Не удалось загрузить профиль");
    const playerData = await playerRes.json();
    
    const elo = playerData.games.cs2?.faceit_elo || playerData.games.csgo?.faceit_elo || "N/A";

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
           let playerFaction = match.teams?.faction1?.players?.some(p => p.player_id === playerId) ? 'faction1' : 'faction2';
           match.results?.winner === playerFaction ? wins++ : losses++;
        }
      }
    }

    const totalGames = wins + losses;
    const eloDiff = (wins * 25) - (losses * 25);
    const sign = eloDiff > 0 ? "+" : "";

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(`Elo: ${elo} | Сегодня: ${wins}W - ${losses}L (${totalGames} игр) | Итог: ${sign}${eloDiff}`);
  } catch (error) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send("Ошибка сервера FACEIT");
  }
}
