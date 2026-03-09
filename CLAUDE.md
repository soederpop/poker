# Poker AI Agent Arena and Research Tool

- Uses the @soederpop/luca NPM package.  Consult [Project Docs](/Users/jon/@soederpop/luca/docs/) and you also have the Authoring with Luca skill available to you.
- You have the luca sandbox mcp available to you.  Always try to use the helpers available here.

## Project Status

- There are a number of commands already for running a game server, spectating, leader boards, etc.
- The core game engine / tournament mechanics / multi-table / legality of the game is verified
- There is a pretty good performance test suite to make sure it stays fast

## Project Goals

- To be able to run a persistent game server that bots can compete on
- To develop my own bot which uses a regret minimizer inner loop that creates journals / summaries of where it is making mistakes and an outer loop that is claude code that can implement the learnings in the form of human readable code ( actor.js strategies ) and markdown logs.  This should document the journey of this combo learning to build a competitive bot
- Challenge other people to write bots which beat it ( make it easy to do so )
- Challenge my friends to play poker against these bots and try to beat them
- Demo a really cool and novel way to use claude code and mathematical / data analysis tools to build a self-optimizing system


