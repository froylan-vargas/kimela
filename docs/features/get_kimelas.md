# Feature: Create endpoint to get available kimelas for a user

## What is a kimela?
A kimela is the product name of this application, it is the representation of a single sport pool, a kimela represents all the sessions(matches) and phases that are part of a sport event and the interaction of the users subscribed to it.

A kimela can have these status: Active, upcoming, paused, completed, cancelled. 

## Tasks
- Using DDD create endpoint to get kimelas for a user
- Create tests for the endpoint

## Implementation
---                                                                                  
  DDD Implementation Plan: Get Kimelas for a User                                      
                                                                                       
  Endpoint                                                                             
                                                                                       
  GET /kimelas?status=ACTIVE   → 200 [{ id, name, sport, status, role, creatorId, ...  
  }]                                                                                   
  - Returns kimelas where the user is creator OR subscriber (single DB query with OR)  
  - Optional status filter; no result = [], not 404                                    
  - role field: "CREATOR" | "SUBSCRIBER" — derived by comparing creatorId vs userId    
                                                                                       
  ---                                                                                  
  Folder structure                                                                     
                                                                                       
  apps/api/src/                                                                        
  ├── shared/prisma/                                                                   
  │   ├── prisma.module.ts                                                             
  │   └── prisma.service.ts
  │                                                                                    
  └── modules/kimela/
      ├── kimela.module.ts
      ├── domain/                                                                      
      │   ├── kimela.entity.ts
      │   ├── kimela-status.enum.ts                                                    
      │   ├── kimela.repository.ts          ← abstract interface
      │   └── errors/kimela.errors.ts                                                  
      ├── application/                                                                 
      │   ├── use-cases/get-kimelas-for-user.use-case.ts                               
      │   ├── dtos/get-kimelas.query.ts                                                
      │   ├── dtos/kimela.dto.ts                                                       
      │   └── mappers/kimela.mapper.ts
      ├── infrastructure/                                                              
      │   ├── persistence/prisma-kimela.repository.ts
      │   ├── persistence/kimela-persistence.mapper.ts                                 
      │   └── kimela.infrastructure.module.ts                                          
      └── presentation/
          ├── kimela.controller.ts                                                     
          ├── dtos/get-kimelas-request.dto.ts
          └── decorators/current-user.decorator.ts                                
   
  ---                                                                                  
  Implementation order
                      
  1. PrismaService + PrismaModule (global, shared)
  2. Domain layer — entity, enum, repository interface, errors                         
  3. Application DTOs + KimelaMapper + mapper unit tests                               
  4. Use case + use case unit tests (mocked repository)                                
  5. Persistence mapper + PrismaKimelaRepository + integration tests (real DB)         
  6. KimelaInfrastructureModule — binds repo token to Prisma impl                      
  7. Controller + @CurrentUser() decorator + validation DTO + controller unit tests    
  8. Register KimelaModule in AppModule, add global ValidationPipe in main.ts          
  9. Resolve CLOSED vs COMPLETED enum mismatch (schema migration)                      
                                                                                       
  ---                                                                                  
  Risks to address before starting

  - Migrate schema to COMPLETED, don't run the migration I'll do it manually, just update the schema
  - Don't create auth, use mock user e471c62d-6015-4ab9-b930-79db54ea75c0
  - Add jest.config.test with ts-jest before writing the first test, create a .md with instructions to run tests. 
  - Consider wrapping in {data,meta} from day one for future pagination.