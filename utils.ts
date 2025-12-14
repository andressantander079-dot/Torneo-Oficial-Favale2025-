import { Match, Team, TableRow, Category } from './types';

// Logic: 
// Sub 12/13 (Best of 3): 2-0 (3pts/0pts), 2-1 (2pts/1pt)
// Sub 16 (Best of 5): 3-0/3-1 (3pts/0pts), 3-2 (2pts/1pt)

export const calculatePoints = (category: Category, homeSets: number, awaySets: number): { home: number, away: number } => {
  const isBestOf3 = category === Category.SUB12 || category === Category.SUB13;
  
  if (isBestOf3) {
    // Best of 3
    if (homeSets === 2 && awaySets === 0) return { home: 3, away: 0 };
    if (homeSets === 0 && awaySets === 2) return { home: 0, away: 3 };
    if (homeSets === 2 && awaySets === 1) return { home: 2, away: 1 };
    if (homeSets === 1 && awaySets === 2) return { home: 1, away: 2 };
  } else {
    // Best of 5 (Sub 16)
    if (homeSets === 3 && (awaySets === 0 || awaySets === 1)) return { home: 3, away: 0 };
    if ((homeSets === 0 || homeSets === 1) && awaySets === 3) return { home: 0, away: 3 };
    if (homeSets === 3 && awaySets === 2) return { home: 2, away: 1 };
    if (homeSets === 2 && awaySets === 3) return { home: 1, away: 2 };
  }
  return { home: 0, away: 0 }; // Draw or incomplete?
};

export const generateTable = (matches: Match[], teams: Team[], category: Category, zone?: string): TableRow[] => {
  // Filter matches for this category
  const categoryMatches = matches.filter(m => m.category === category && m.isFinished);
  
  // Filter teams for this category (and zone if provided)
  let categoryTeams = teams.filter(t => t.category === category);
  if (zone) {
    categoryTeams = categoryTeams.filter(t => t.zone === zone);
  }

  const table: Record<string, TableRow> = {};

  // Initialize table
  categoryTeams.forEach(team => {
    table[team.id] = {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      setsWon: 0,
      setsLost: 0,
      pointsRatio: 0
    };
  });

  // Calculate stats
  categoryMatches.forEach(match => {
    const homeStats = table[match.homeTeamId];
    const awayStats = table[match.awayTeamId];

    // Only process if both teams are in the current table context (e.g. correct zone)
    // Important for cross-zone matches or playoffs if we only want group stage table
    if (!homeStats || !awayStats) return;

    // Count Sets
    let homeSets = 0;
    let awaySets = 0;
    match.sets.forEach(s => {
      if (s.home > s.away) homeSets++;
      else awaySets++;
    });

    // Update played
    homeStats.played++;
    awayStats.played++;

    // Update sets
    homeStats.setsWon += homeSets;
    homeStats.setsLost += awaySets;
    awayStats.setsWon += awaySets;
    awayStats.setsLost += homeSets;

    // Update winner/loser
    if (homeSets > awaySets) {
      homeStats.won++;
      awayStats.lost++;
    } else {
      awayStats.won++;
      homeStats.lost++;
    }

    // Update Points
    const points = calculatePoints(category, homeSets, awaySets);
    homeStats.points += points.home;
    awayStats.points += points.away;
  });

  // Sort: Points DESC, then Sets Ratio (simplified to Sets Won for this demo), then Name
  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if ((b.setsWon - b.setsLost) !== (a.setsWon - a.setsLost)) return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
    return a.teamName.localeCompare(b.teamName);
  });
};