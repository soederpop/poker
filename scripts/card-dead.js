/** 
 * The purpose of this script is to analyze w/ data the different realities about
 * being "card dead".  How long can a streak of weak hands be dealt to you? Another purpose is
 * to see how evenly luck is distributed: how often are you dealt kings when another player is dealt aces?
 * 
*/
require("babel-plugin-require-context-hook/register")();

const runtime = require("../runtime");
const { omit, values, mean, max, mapValues, keyBy } = runtime.lodash;

main();

async function main() {
  await setup();
  await summarizeHandFiles();
  await combineHandFiles();
}

async function setup() {
  await runtime.fsx.mkdirpAsync(runtime.resolve("data", "in"));
  await runtime.fsx.mkdirpAsync(runtime.resolve("data", "out"));
  await runtime.fsx.mkdirpAsync(runtime.resolve("data", "summarized"));
  await runtime.fsx.mkdirpAsync(runtime.resolve("data", "combined"));
}

async function doWork() {
  await dealPreFlop();
  await processHandFiles();
}

async function combineHandFiles() {
  let dataFiles = await runtime.fsx
    .readdirAsync(runtime.resolve("data", "summarized"))
    .then(files => files.map(d => runtime.resolve("data", "summarized", d)));

  const summaries = await Promise.all(
    dataFiles.map(file => runtime.fsx.readJsonAsync(file))
  );

  const combined = summaries.reduce((memo, playerData) => {
    return mapValues(
      playerData,
      (data, player) => {

        const bucket = memo[player]
        return {
          pct: (bucket.pct || 0) + data.pct,
          count: (bucket.count || 0) + data.count,
          drySpellLength: (bucket.drySpellLength || 0) + data.drySpellLength,
          acesDrySpell: (bucket.acesDrySpell || 0) + data.acesDrySpell,
          kingsDrySpell: (bucket.queensDrySpell || 0) + data.queensDrySpell,
          queensDrySpell: (bucket.queensDrySpell || 0) + data.queensDrySpell,
          averageDrySpell: (bucket.averageDrySpell || 0) + data.averageDrySpell,
          averageAcesDrySpell:
            (bucket.averageAcesDrySpell || 0) + data.averageAcesDrySpell,
          averageKingsDrySpell:
            (bucket.averageKingsDrySpell || 0) + data.averageKingsDrySpell,
          averageQueensDrySpell:
            (bucket.averageQueensDrySpell || 0) + data.averageQueensDrySpell,
          acesCount: (bucket.acesCount || 0) + data.acesCount,
          kingsCount: (bucket.kingsCount || 0) + data.kingsCount,
          stackedAces: (bucket.stackedAces || 0) + data.stackedAces,
          bustedKings: (bucket.bustedKings || 0) + data.bustedKings,
          bustedQueens: (bucket.bustedQueens || 0) + data.bustedQueens
        };
      },
      {}
    );
  });

  const averaged = mapValues(combined, (player) => mapValues(player, (v) => parseInt((v / dataFiles.length).toFixed(2), 10)))
  await runtime.fsx.writeFileAsync(
    runtime.resolve("data", "combined", "card-dead.json"),
    JSON.stringify(averaged, null, 2)
  );
}

async function summarizeFile(file) {
  console.log("Summarizing", file);
  const data = await runtime.fsx.readJsonAsync(file);
  const summarized = mapValues(summarize(data, file), data =>
    omit(
      data,
      "acesIndexes",
      "queensIndexes",
      "kingsIndexes",
      "goodHandIndexes"
    )
  );
  await runtime.fsx.writeJsonAsync(
    runtime.resolve("data", "summarized", file.split("/").pop()),
    summarized
  );
  // await runtime.fsx.removeAsync(file)
}

function summarize(session, file) {
  const isGood = h =>
    ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AQs", "AK"].indexOf(h) > -1;
  const isAces = h => h === "AA";
  const isKings = h => h === "KK";
  const isQueens = h => h === "QQ";

  const summarized = mapValues(session, (hands, player) => {
    const totalHands = hands.length;
    const goodHandIndexes = hands
      .map((h, i) => (isGood(h) ? i : false))
      .filter(h => h !== false);
    const acesIndexes = hands
      .map((h, i) => (isAces(h) ? i : false))
      .filter(h => h !== false);
    const kingsIndexes = hands
      .map((h, i) => (isKings(h) ? i : false))
      .filter(h => h !== false);
    const queensIndexes = hands
      .map((h, i) => (isQueens(h) ? i : false))
      .filter(h => h !== false);
    const goodHands = goodHandIndexes.length;

    const streaks = goodHandIndexes.map((index, i) =>
      i === 0 ? index : index - goodHandIndexes[i - 1]
    );
    const acesStreaks = acesIndexes.map((index, i) =>
      i === 0 ? index : index - acesIndexes[i - 1]
    );
    const kingsStreaks = kingsIndexes.map((index, i) =>
      i === 0 ? index : index - kingsIndexes[i - 1]
    );
    const queensStreaks = queensIndexes.map((index, i) =>
      i === 0 ? index : index - queensIndexes[i - 1]
    );

    return {
      pct: goodHands / totalHands,
      count: goodHands,
      drySpellLength: max(streaks),
      acesDrySpell: max(acesStreaks),
      kingsDrySpell: max(kingsStreaks),
      queensDrySpell: max(queensStreaks),
      averageDrySpell: mean(streaks),
      averageAcesDrySpell: mean(acesStreaks),
      averageKingsDrySpell: mean(kingsStreaks),
      averageQueensDrySpell: mean(queensStreaks),
      acesCount: acesIndexes.length,
      kingsCount: kingsIndexes.length,
      acesIndexes,
      kingsIndexes,
      queensIndexes,
      goodHandIndexes
    };
  });

  return mapValues(summarized, (summary, player) => {
    const { kingsIndexes, queensIndexes, acesIndexes } = summary;
    const otherHands = values(omit(summarized, player));

    const bustedKings = kingsIndexes.filter(
      ki => !!otherHands.find(({ acesIndexes }) => acesIndexes.indexOf(ki) > -1)
    ).length;
    const bustedQueens = queensIndexes.filter(
      ki =>
        !!otherHands.find(
          ({ acesIndexes, kingsIndexes }) =>
            kingsIndexes.indexOf(ki) > -1 || acesIndexes.indexOf(ki) > -1
        )
    ).length;
    const stackedAces = acesIndexes.filter(
      ki =>
        !!otherHands.find(
          ({ goodHandIndexes }) => goodHandIndexes.indexOf(ki) > -1
        )
    ).length;

    return omit(
      {
        ...summary,
        stackedAces,
        bustedKings,
        bustedQueens
      },
      "goodHandIndexes",
      "acesIndexes",
      "kingsIndexes",
      "queensIndexes"
    );
  });
}

async function summarizeHandFiles() {
  let dataFiles = await runtime.fsx
    .readdirAsync(runtime.resolve("data", "out"))
    .then(files => files.map(d => runtime.resolve("data", "out", d)));

  if (!dataFiles.length) {
    console.log("No more files to process");
    return;
  } else {
    console.log(`${dataFiles.length} files to process`);
  }

  await Promise.all(dataFiles.map(summarizeFile));
}

async function processHandFiles() {
  let dataFiles = await runtime.fsx
    .readdirAsync(runtime.resolve("data", "in"))
    .then(files => files.map(d => runtime.resolve("data", "in", d)));

  if (!dataFiles.length) {
    console.log("No more files to process");
    return;
  } else {
    console.log(`${dataFiles.length} files to process`);
  }

  await Promise.all(dataFiles.slice(0, 3).map(processFile));
}

async function processFile(file) {
  console.log("Processing", file);
  const data = await runtime.fsx.readJsonAsync(file);
  const processed = process(data, file);
  await runtime.fsx.writeJsonAsync(
    runtime.resolve("data", "out", file.split("/").pop()),
    processed
  );
  await runtime.fsx.removeAsync(file);
}

function normalizeHand(hand) {
  const [c1, c2] = hand;
  const [r1, s1] = c1.split("");
  const [r2, s2] = c2.split("");

  if (r1 === r2) return [r1, r2].join("");
  if (s1 === s2) return [r1, r2, "s"].join("");
  return [r1, r2, "o"].join("");
}

function process(hands, file) {
  console.log("processing", hands.length);
  return hands.reduce(
    (memo, hand, i) => {
      let k = 0;

      if (i % 10000 === 0) {
        console.log("Processing hand", i, file.split("/").pop());
      }
      const byPlayer = keyBy(hand, i => `P${(k = k + 1)}`);
      return mapValues(memo, (v, k) => v.concat(byPlayer[k]));
    },
    {
      P1: [],
      P2: [],
      P3: [],
      P4: [],
      P5: [],
      P6: [],
      P7: [],
      P8: [],
      P9: []
    }
  );
}

function dealPreFlop() {
  const base =
    runtime.fsx.readdirSync(runtime.resolve("data", "out")).length + 1;

  const hands = Array.from(new Array(50 * 1000)).map((_, i) => {
    const cards = runtime.lodash.shuffle(runtime.Range.cards).map(c => c.name);
    return runtime.lodash.chunk(cards.slice(0, 18), 2).map(normalizeHand);
  });

  runtime.fsx.writeJsonSync(
    runtime.resolve("data", "in", `${base}.json`),
    hands
  );
}
