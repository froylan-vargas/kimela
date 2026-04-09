# Feature: Create endpoint to get available qimelas for a user

## What is a qimela?
A qimela is the product name of this application, it is the representation of a single sport pool, a qimela represents all the sessions(matches) and phases that are part of a sport event and the interaction of the users subscribed to it.

A qimela can have these status: Active, upcoming, paused, completed, cancelled. 

## Tasks
- Using DDD create endpoint to get qimelas for a user
- Create tests for the endpoint

## Implementation
---                                                                                  
  DDD Implementation Plan: Get Qimelas for a User                                      
                                                                                       
  Endpoint                                                                             
                                                                                       
  GET /qimelas?status=ACTIVE   → 200 [{ id, name, sport, status, role, creatorId, ...  
  }]                                                                                   
  - Returns qimelas where the user is creator OR subscriber (single DB query with OR)  
  - Optional status filter; no result = [], not 404                                    
  - role field: "CREATOR" | "SUBSCRIBER" — derived by comparing creatorId vs userId    
                                                                                       
  ---                                                                                  
  Folder structure                                                                     
                                                                                       
  apps/api/src/                                                                        
  ├── shared/prisma/                                                                   
  │   ├── prisma.module.ts                                                             
  │   └── prisma.service.ts
  │                                                                                    
  └── modules/qimela/
      ├── qimela.module.ts
      ├── domain/                                                                      
      │   ├── qimela.entity.ts
      │   ├── qimela-status.enum.ts                                                    
      │   ├── qimela.repository.ts          ← abstract interface
      │   └── errors/qimela.errors.ts                                                  
      ├── application/                                                                 
      │   ├── use-cases/get-qimelas-for-user.use-case.ts                               
      │   ├── dtos/get-qimelas.query.ts                                                
      │   ├── dtos/qimela.dto.ts                                                       
      │   └── mappers/qimela.mapper.ts
      ├── infrastructure/                                                              
      │   ├── persistence/prisma-qimela.repository.ts
      │   ├── persistence/qimela-persistence.mapper.ts                                 
      │   └── qimela.infrastructure.module.ts                                          
      └── presentation/
          ├── qimela.controller.ts                                                     
          ├── dtos/get-qimelas-request.dto.ts
          └── decorators/current-user.decorator.ts                                
   
  ---                                                                                  
  Implementation order
                      
  1. PrismaService + PrismaModule (global, shared)
  2. Domain layer — entity, enum, repository interface, errors                         
  3. Application DTOs + QimelaMapper + mapper unit tests                               
  4. Use case + use case unit tests (mocked repository)                                
  5. Persistence mapper + PrismaQimelaRepository + integration tests (real DB)         
  6. QimelaInfrastructureModule — binds repo token to Prisma impl                      
  7. Controller + @CurrentUser() decorator + validation DTO + controller unit tests    
  8. Register QimelaModule in AppModule, add global ValidationPipe in main.ts          
  9. Resolve CLOSED vs COMPLETED enum mismatch (schema migration)                      
                                                                                       
  ---                                                                                  
  Risks to address before starting

  - Migrate schema to COMPLETED, don't run the migration I'll do it manually, just update the schema
  - Don't create auth, use mock user e471c62d-6015-4ab9-b930-79db54ea75c0
  - Add jest.config.test with ts-jest before writing the first test, create a .md with instructions to run tests. 
  - Consider wrapping in {data,meta} from day one for future pagination.