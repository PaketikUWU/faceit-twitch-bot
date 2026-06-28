export default async function handler(req, res) {
  const playerId = "cbfa4eb1-c67d-472d-beea-2fb5e56d73f4"; 

  try {
    // 1. Запрашиваем данные через публичное веб-API FACEIT (без авторизации)
    const playerRes = await fetch(`https://api.faceit.com/users/v1/users/${playerId}`);
    if (!playerRes.ok) return res.status(200).send("Ошибка: Профиль не найден");
    const playerJson = await playerRes.json();
    
    // Вытаскиваем текущее Эло для CS2
    const elo = playerJson.payload?.games?.cs2?.faceit_elo || "N/A";

    // 2. Запрашиваем историю матчей через публичный эндпоинт
    const historyRes = await fetch(`https://api.faceit.com/stats/v1/players/${playerId}/games/cs2?size=20`);
    const historyJson = await historyRes.json();

    let wins = 0;
    let losses = 0;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Проверяем матчи за сегодня
    if (historyJson && Array.isArray(historyJson)) {
      for (const match of historyJson) {
        // Обычные даты матчей на вебе идут в таймстемпе
        if (match.date >= startOfDay) {
          if (match.status === "FORFEIT" || match.status === "FINISHED") {
            // Проверяем, выиграл ли игрок (сравниваем его команду и результат)
            if (match.i10 === match.teamId) {
              wins++;
            } else {
              losses++;
            }
          }
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
    res.status(200).send("Ошибка при запросе к веб-серверу FACEIT");
  }
}
