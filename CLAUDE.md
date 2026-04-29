# qimela

system to create, manage and participate in sports pools

## System Architecture

- ** Backend **: Nest.js
- ** Frontend **: Next.js

## Tech stack

### Backend

- **Framework**: Nest.js
- **Base de datos**: PostgreSQL
- **ORM**: Prisma
- **Orchestrator**: Docker Compose
- **Gestión dependencias**: pnpm
- **Puerto**: 3000

### Frontend (Next.js)

- **Framework**: Next.js
- **Estilos**: SCSS + CSS Modules
- **Testing**: Vitest + React Testing Library

## Importat

- All code should be en english, but web app (ui) should always be in spanish.

## Definitions

- qimela: A qimela is the representation of a single sport pool, a qimela represents all the sessions(matches) and phases that are part of a sport event and the interaction of the users subscribed to it.
- Sports: qimela pools can be of multiple events e.g. soccer, f1, tennis, etc.
- Leagues: Leagues are not events, they are a group of contenders that will compete in an event e.g. Premier League, La Liga, Liga MX, Champions League, the World Cup will have its own league of international contenders, F1 has its own league of drivers.
- Contenders: Contenders are the participants of an event, they are previously registered in a league and can be piolots, teams, players, etc.
- Event: An event is a single sport event that happens in an specific point of time, for instance the league 'Liga MX' will exist forever but the Event 'Liga MX Clausura 2026' will only last 6 months.
- Phase: A phase is a group of sessions that are part of an event, for instance the 'World Cup 2026' will have many phases, the 'Group Stage Round 1', 'Group Stage Round 2', 'Group Stage Round 3', 'Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'.
- Session: A session is a single match or game that is part of a phase, for instance the 'Group Stage Round 1' will have many sessions, the 'Session 1', 'Session 2', etc.
