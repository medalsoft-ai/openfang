# 第六章：内存系统实现

> 为AI Agent构建持久化记忆：从键值存储到向量搜索

## 本章目标

完成本章后，你将：
- 理解OpenFang的三层存储架构设计
- 掌握Memory trait的统一抽象设计
- 了解SQLite在嵌入式存储中的应用
- 理解向量搜索的基本原理
- 了解知识图谱的数据模型
- 掌握Session管理的实现机制

## 目录

1. [三层存储架构](#1-三层存储架构) - Structured/Semantic/Knowledge
2. [Memory Trait设计](#2-memory-trait设计) - 统一存储接口
3. [SQLite实现详解](#3-sqlite实现详解) - 嵌入式存储引擎
4. [向量搜索基础](#4-向量搜索基础) - 语义检索实现
5. [知识图谱简介](#5-知识图谱简介) - 实体关系存储
6. [与MongoDB/Redis对比](#6-与mongodbredis对比) - 选型思考
7. [Session管理](#7-session管理) - 对话状态维护
8. [动手练习](#8-动手练习)

---

## 1. 三层存储架构

OpenFang的内存系统采用三层架构设计，分别对应不同类型的数据存储需求：

```
┌─────────────────────────────────────────────────────────────┐
│                    MemorySubstrate                          │
│                   (统一接口层)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Structured  │ │  Semantic   │ │  Knowledge  │
│   Store     │ │   Store     │ │   Store     │
│  (结构化)    │ │  (语义)      │ │  (知识图谱)  │
├─────────────┤ ├─────────────┤ ├─────────────┤
│ • KV键值对   │ │ • 文本记忆   │ │ • 实体       │
│ • Agent配置 │ │ • 向量嵌入   │ │ • 关系       │
│ • 元数据     │ │ • 相似度搜索 │ │ • 图查询     │
└─────────────┘ └─────────────┘ └─────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌─────────────┐                 ┌─────────────┐
│   Session   │                 │    Usage    │
│   Store     │                 │   Store     │
│ (对话历史)   │                 │ (用量统计)   │
└─────────────┘                 └─────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │     SQLite      │
              │   (统一后端)     │
              └─────────────────┘
```

### 1.1 各层职责对比

| 存储层 | 数据类型 | 查询方式 | 适用场景 |
|--------|----------|----------|----------|
| Structured | JSON/标量 | 精确匹配 | 配置、状态、元数据 |
| Semantic | 文本+向量 | 相似度搜索 | 记忆检索、语义匹配 |
| Knowledge | 实体+关系 | 图遍历 | 知识推理、关联发现 |
| Session | 消息序列 | 时间范围 | 对话历史、上下文 |

### 1.2 代码中的架构体现

```rust
// crates/openfang-memory/src/substrate.rs
pub struct MemorySubstrate {
    conn: Arc<Mutex<Connection>>,
    structured: StructuredStore,    // KV键值存储
    semantic: SemanticStore,        // 语义记忆存储
    knowledge: KnowledgeStore,      // 知识图谱存储
    sessions: SessionStore,         // 会话管理
    consolidation: ConsolidationEngine, // 记忆整理
    usage: UsageStore,              // 用量统计
}
```

**设计哲学**：单一SQLite数据库支撑多层存储，简化部署运维，同时通过专门的Store实现不同查询语义。

---

## 2. Memory Trait设计

Memory trait是OpenFang存储系统的核心抽象，为Agent提供统一的存储接口。

### 2.1 Trait定义

```rust
// crates/openfang-types/src/memory.rs
#[async_trait]
pub trait Memory: Send + Sync {
    // ===== 结构化存储操作 =====
    async fn get(&self, agent_id: AgentId, key: &str)
        -> OpenFangResult<Option<serde_json::Value>>;

    async fn set(&self, agent_id: AgentId, key: &str, value: serde_json::Value)
        -> OpenFangResult<()>;

    async fn delete(&self, agent_id: AgentId, key: &str)
        -> OpenFangResult<()>;

    // ===== 语义存储操作 =====
    async fn remember(
        &self,
        agent_id: AgentId,
        content: &str,
        source: MemorySource,
        scope: &str,
        metadata: HashMap<String, serde_json::Value>,
    ) -> OpenFangResult<MemoryId>;

    async fn recall(
        &self,
        query: &str,
        limit: usize,
        filter: Option<MemoryFilter>,
    ) -> OpenFangResult<Vec<MemoryFragment>>;

    async fn forget(&self, id: MemoryId) -> OpenFangResult<()>;

    // ===== 知识图谱操作 =====
    async fn add_entity(&self, entity: Entity) -> OpenFangResult<String>;
    async fn add_relation(&self, relation: Relation) -> OpenFangResult<String>;
    async fn query_graph(&self, pattern: GraphPattern) -> OpenFangResult<Vec<GraphMatch>>;

    // ===== 维护操作 =====
    async fn consolidate(&self) -> OpenFangResult<ConsolidationReport>;
    async fn export(&self, format: ExportFormat) -> OpenFangResult<Vec<u8>>;
    async fn import(&self, data: &[u8], format: ExportFormat) -> OpenFangResult<ImportReport>;
}
```

### 2.2 与Node.js存储API对比

**Node.js (Redis/MongoDB风格):**
```javascript
// 键值操作
await redis.set('user:1:name', 'Alice');
const name = await redis.get('user:1:name');

// 文档存储
await db.collection('memories').insertOne({
    agentId: 'agent-1',
    content: 'User likes Rust',
    createdAt: new Date()
});

// 向量搜索 (使用专用库)
const results = await vectorStore.similaritySearch('Rust programming', 5);
```

**OpenFang Rust实现:**
```rust
// 键值操作 - 类型安全
memory.set(agent_id, "user_name", json!("Alice")).await?;
let name: Option<Value> = memory.get(agent_id, "user_name").await?;

// 语义记忆 - 统一接口
let memory_id = memory.remember(
    agent_id,
    "User likes Rust programming",
    MemorySource::Conversation,
    "episodic",
    HashMap::new()
).await?;

// 向量搜索 - 内置支持
let results = memory.recall("Rust programming", 5, None).await?;
```

**关键差异：**
- Rust使用`?`传播错误，Node.js使用try/catch
- Rust类型系统在编译期保证数据一致性
- Memory trait将多种存储语义统一在单一接口下

### 2.3 Async Trait的实现

Rust原生不支持trait中的async fn，OpenFang使用`async_trait`宏：

```rust
use async_trait::async_trait;

#[async_trait]
impl Memory for MemorySubstrate {
    async fn get(&self, agent_id: AgentId, key: &str) -> OpenFangResult<Option<Value>> {
        // 同步操作在阻塞线程池中执行
        let store = self.structured.clone();
        let key = key.to_string();
        tokio::task::spawn_blocking(move || store.get(agent_id, &key))
            .await
            .map_err(|e| OpenFangError::Internal(e.to_string()))?
    }
    // ...
}
```

**注意**：SQLite是同步IO，使用`spawn_blocking`避免阻塞异步运行时。

---

## 3. SQLite实现详解

OpenFang选择SQLite作为统一存储后端，这是针对桌面AI Agent场景的精心选择。

### 3.1 为什么选择SQLite？

| 特性 | SQLite | MongoDB | Redis |
|------|--------|---------|-------|
| 部署方式 | 嵌入式 | 独立服务 | 独立服务 |
| 配置复杂度 | 零配置 | 需要安装配置 | 需要安装配置 |
| 数据持久化 | 内置 | 内置 | 需配置AOF/RDB |
| 查询能力 | SQL | 文档查询 | 键值+数据结构 |
| 向量搜索 | 应用层实现 | 需专用扩展 | 需RedisAI模块 |
| 资源占用 | 极低 | 中等 | 中等 |
| 多进程访问 | 支持(WAL模式) | 网络协议 | 网络协议 |

**适用场景**：单用户桌面应用、边缘设备、需要零配置部署的Agent。

### 3.2 数据库初始化

```rust
// crates/openfang-memory/src/substrate.rs
impl MemorySubstrate {
    pub fn open(db_path: &Path, decay_rate: f32) -> OpenFangResult<Self> {
        let conn = Connection::open(db_path)
            .map_err(|e| OpenFangError::Memory(e.to_string()))?;

        // WAL模式提升并发性能
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")
            .map_err(|e| OpenFangError::Memory(e.to_string()))?;

        // 运行迁移创建表结构
        run_migrations(&conn)?;

        let shared = Arc::new(Mutex::new(conn));
        Ok(Self {
            structured: StructuredStore::new(Arc::clone(&shared)),
            semantic: SemanticStore::new(Arc::clone(&shared)),
            knowledge: KnowledgeStore::new(Arc::clone(&shared)),
            // ...
        })
    }
}
```

### 3.3 表结构设计

**结构化存储 (KV Store):**
```sql
CREATE TABLE kv_store (
    agent_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value BLOB NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (agent_id, key)
);
```

**语义存储 (Memories):**
```sql
CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    scope TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    metadata TEXT,  -- JSON
    embedding BLOB, -- 向量二进制
    created_at TEXT,
    accessed_at TEXT,
    access_count INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0
);
```

**知识图谱 (Entities & Relations):**
```sql
CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    name TEXT NOT NULL,
    properties TEXT,  -- JSON
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE relations (
    id TEXT PRIMARY KEY,
    source_entity TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    properties TEXT,
    confidence REAL,
    created_at TEXT
);
```

### 3.4 连接池与并发

```rust
// 使用Arc<Mutex<Connection>>共享连接
pub struct StructuredStore {
    conn: Arc<Mutex<Connection>>,
}

impl StructuredStore {
    pub fn get(&self, agent_id: AgentId, key: &str) -> OpenFangResult<Option<Value>> {
        let conn = self.conn.lock()
            .map_err(|e| OpenFangError::Internal(e.to_string()))?;

        // 使用 rusqlite 进行查询
        let mut stmt = conn.prepare(
            "SELECT value FROM kv_store WHERE agent_id = ?1 AND key = ?2"
        )?;

        let result = stmt.query_row(params![agent_id.0.to_string(), key], |row| {
            let blob: Vec<u8> = row.get(0)?;
            Ok(blob)
        });

        match result {
            Ok(blob) => {
                let value = serde_json::from_slice(&blob)?;
                Ok(Some(value))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}
```

**并发策略**：
- WAL(Write-Ahead Logging)模式支持读写并发
- 忙等待超时5000ms避免死锁
- Arc<Mutex<>>确保线程安全

---

## 4. 向量搜索基础

语义记忆的核心能力是向量相似度搜索，OpenFang实现了基于余弦相似度的向量检索。

### 4.1 向量存储格式

```rust
// crates/openfang-memory/src/semantic.rs

/// 将浮点向量序列化为字节(BLOB存储)
fn embedding_to_bytes(embedding: &[f32]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(embedding.len() * 4);
    for &val in embedding {
        bytes.extend_from_slice(&val.to_le_bytes());
    }
    bytes
}

/// 从字节反序列化向量
fn embedding_from_bytes(bytes: &[u8]) -> Vec<f32> {
    bytes.chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect()
}
```

### 4.2 余弦相似度计算

```rust
/// 计算两个向量的余弦相似度
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }

    let mut dot = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;

    for i in 0..a.len() {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    let denom = norm_a.sqrt() * norm_b.sqrt();
    if denom < f32::EPSILON {
        0.0
    } else {
        dot / denom  // 范围: [-1, 1]
    }
}
```

**原理说明**：
- 余弦相似度衡量两个向量的夹角余弦值
- 1.0表示完全相同方向，0.0表示正交，-1.0表示相反
- 在语义搜索中通常只关心[0, 1]范围

### 4.3 两阶段搜索策略

```rust
pub fn recall_with_embedding(
    &self,
    query: &str,
    limit: usize,
    filter: Option<MemoryFilter>,
    query_embedding: Option<&[f32]>,
) -> OpenFangResult<Vec<MemoryFragment>> {
    let conn = self.conn.lock()?;

    // 阶段1: 从数据库获取候选集(比limit多10倍用于重排序)
    let fetch_limit = if query_embedding.is_some() {
        (limit * 10).max(100)
    } else {
        limit
    };

    // 构建SQL查询
    let mut sql = String::from(
        "SELECT id, agent_id, content, embedding, ...
         FROM memories WHERE deleted = 0"
    );

    // 应用过滤器
    if let Some(ref f) = filter {
        if let Some(agent_id) = f.agent_id {
            sql.push_str(" AND agent_id = ?");
        }
        if let Some(ref scope) = f.scope {
            sql.push_str(" AND scope = ?");
        }
        // ...
    }

    sql.push_str(" ORDER BY accessed_at DESC LIMIT ?");

    // 阶段2: 如果有查询向量，按余弦相似度重排序
    let mut fragments = /* 执行查询 */ vec![];

    if let Some(qe) = query_embedding {
        fragments.sort_by(|a, b| {
            let sim_a = a.embedding.as_deref()
                .map(|e| cosine_similarity(qe, e))
                .unwrap_or(-1.0);
            let sim_b = b.embedding.as_deref()
                .map(|e| cosine_similarity(qe, e))
                .unwrap_or(-1.0);
            sim_b.partial_cmp(&sim_a).unwrap_or(Ordering::Equal)
        });
        fragments.truncate(limit);
    }

    Ok(fragments)
}
```

### 4.4 向量搜索的局限性

OpenFang的当前实现是**应用层向量搜索**，特点：
- ✅ 无需外部依赖，部署简单
- ✅ 适合中小规模数据(万级以下)
- ❌ 全表扫描，O(N)复杂度
- ❌ 无法利用数据库索引加速

**生产优化方向**：
- 使用专用向量数据库(Pinecone, Milvus, Qdrant)
- 或SQLite向量扩展(sqlite-vss)
- 或近似最近邻算法(HNSW, IVF)

---

## 5. 知识图谱简介

知识图谱用于存储实体间的结构化关系，支持推理和关联发现。

### 5.1 数据模型

```rust
// crates/openfang-types/src/memory.rs

/// 知识图谱中的实体
pub struct Entity {
    pub id: String,
    pub entity_type: EntityType,  // Person, Organization, Project, etc.
    pub name: String,
    pub properties: HashMap<String, serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 实体间的关系
pub struct Relation {
    pub source: String,      // 源实体ID
    pub relation: RelationType,
    pub target: String,      // 目标实体ID
    pub properties: HashMap<String, serde_json::Value>,
    pub confidence: f32,
    pub created_at: DateTime<Utc>,
}

/// 关系类型枚举
pub enum RelationType {
    WorksAt,      // 工作于
    KnowsAbout,   // 了解
    RelatedTo,    // 相关
    DependsOn,    // 依赖
    OwnedBy,      // 被拥有
    CreatedBy,    // 被创建
    LocatedIn,    // 位于
    PartOf,       // 部分
    Uses,         // 使用
    Produces,     // 产生
    Custom(String),
}
```

### 5.2 图查询模式

```rust
/// 图查询模式
pub struct GraphPattern {
    pub source: Option<String>,           // 源实体过滤
    pub relation: Option<RelationType>,   // 关系类型过滤
    pub target: Option<String>,           // 目标实体过滤
    pub max_depth: u32,                   // 最大遍历深度
}

// 使用示例: 查询"Alice"工作的公司
let pattern = GraphPattern {
    source: Some("alice".to_string()),
    relation: Some(RelationType::WorksAt),
    target: None,
    max_depth: 1,
};

let matches = memory.query_graph(pattern).await?;
for m in matches {
    println!("{} works at {}", m.source.name, m.target.name);
}
```

### 5.3 与属性图数据库对比

| 特性 | OpenFang知识图谱 | Neo4j | Amazon Neptune |
|------|------------------|-------|----------------|
| 存储后端 | SQLite | 专用图存储 | 专用图存储 |
| 查询语言 | Rust API | Cypher | Gremlin/SPARQL |
| 遍历性能 | 一般(SQL JOIN) | 优化 | 优化 |
| 部署复杂度 | 低 | 中 | 高 |
| 适用规模 | 小型图谱 | 大规模 | 大规模 |

**设计取舍**：OpenFang优先简化部署，适合个人知识管理；企业级应用可考虑对接专业图数据库。

---

## 6. 与MongoDB/Redis对比

理解不同存储方案的优劣，有助于在实际项目中做出正确选择。

### 6.1 功能对比矩阵

| 功能 | OpenFang/SQLite | MongoDB | Redis |
|------|-----------------|---------|-------|
| **结构化存储** | ✅ SQL+JSON | ✅ 文档模型 | ⚠️ 需序列化 |
| **向量搜索** | ⚠️ 应用层实现 | ⚠️ Atlas Search | ⚠️ RedisAI |
| **知识图谱** | ✅ 关系表 | ⚠️ $lookup | ❌ 不适合 |
| **持久化** | ✅ 默认 | ✅ 默认 | ⚠️ 需配置 |
| **发布订阅** | ❌ 不支持 | ⚠️ Change Streams | ✅ Pub/Sub |
| **集群部署** | ❌ 单节点 | ✅ 分片副本集 | ✅ Cluster |
| **内存优先** | ❌ 磁盘为主 | ⚠️ 内存映射 | ✅ 纯内存 |
| **查询灵活性** | ✅ SQL | ✅ 丰富 | ⚠️ 有限 |

### 6.2 架构选型建议

**选择OpenFang/SQLite当:**
- 构建桌面/边缘AI应用
- 需要零配置部署
- 数据规模在GB级别
- 优先简单而非极致性能

**选择MongoDB当:**
- 需要水平扩展
- 数据结构多变无模式
- 已有MongoDB基础设施
- 需要地理空间查询等高级特性

**选择Redis当:**
- 需要亚毫秒级响应
- 主要做缓存/会话存储
- 需要发布订阅机制
- 数据可接受内存限制

### 6.3 Node.js开发者迁移指南

| 场景 | Node.js惯用方案 | OpenFang等价方案 |
|------|-----------------|------------------|
| 配置存储 | `redis.set/get` | `memory.set/get` |
| 文档存储 | `db.collection.insert` | `memory.remember` |
| 向量搜索 | `pinecone.query` | `memory.recall` |
| 图查询 | `neo4j.run('MATCH...')` | `memory.query_graph` |
| 会话管理 | `express-session` | `SessionStore` |

---

## 7. Session管理

Session是Agent对话状态的载体，维护消息历史和上下文窗口。

### 7.1 Session数据结构

```rust
// crates/openfang-memory/src/session.rs

pub struct Session {
    pub id: SessionId,           // 会话唯一ID
    pub agent_id: AgentId,       // 所属Agent
    pub messages: Vec<Message>,  // 消息历史
    pub context_window_tokens: u64,  // 预估token数
    pub label: Option<String>,   // 可选标签
}

pub struct SessionStore {
    conn: Arc<Mutex<Connection>>,
}
```

### 7.2 核心操作

```rust
impl SessionStore {
    /// 加载会话
    pub fn get_session(&self, session_id: SessionId) -> OpenFangResult<Option<Session>> {
        let conn = self.conn.lock()?;
        let mut stmt = conn.prepare(
            "SELECT agent_id, messages, context_window_tokens, label
             FROM sessions WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![session_id.0.to_string()], |row| {
            let messages_blob: Vec<u8> = row.get(1)?;
            // 使用MessagePack反序列化(比JSON紧凑)
            let messages: Vec<Message> = rmp_serde::from_slice(&messages_blob)?;
            Ok(Session { /* ... */ })
        });

        match result {
            Ok(session) => Ok(Some(session)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// 保存会话
    pub fn save_session(&self, session: &Session) -> OpenFangResult<()> {
        let conn = self.conn.lock()?;
        // MessagePack序列化(高效二进制)
        let messages_blob = rmp_serde::to_vec_named(&session.messages)?;

        conn.execute(
            "INSERT INTO sessions (id, agent_id, messages, context_window_tokens, label, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
             ON CONFLICT(id) DO UPDATE SET
                messages = ?3, context_window_tokens = ?4, label = ?5, updated_at = ?6",
            params![
                session.id.0.to_string(),
                session.agent_id.0.to_string(),
                messages_blob,
                session.context_window_tokens as i64,
                session.label.as_deref(),
                Utc::now().to_rfc3339(),
            ],
        )?;
        Ok(())
    }
}
```

### 7.3 跨渠道记忆(Cross-Channel Memory)

OpenFang支持"Canonical Session"机制，实现跨对话渠道的记忆共享：

```rust
/// 追加消息到Agent的canonical session
pub fn append_canonical(
    &self,
    agent_id: AgentId,
    messages: &[Message],
    compaction_threshold: Option<usize>,
) -> OpenFangResult<()> {
    // 1. 获取或创建canonical session
    let session_id = SessionId::canonical(agent_id);
    let mut session = self.get_session(session_id)?
        .unwrap_or_else(|| Session::new(session_id, agent_id));

    // 2. 追加新消息
    session.messages.extend(messages.iter().cloned());

    // 3. 如果超过阈值，触发压缩
    if let Some(threshold) = compaction_threshold {
        if session.messages.len() > threshold {
            self.compact_session(&mut session)?;
        }
    }

    // 4. 保存
    self.save_session(&session)
}

/// 压缩旧消息(保留最近N条， older部分生成摘要)
fn compact_session(&self, session: &mut Session) -> OpenFangResult<()> {
    // 实现策略: 保留最近20条，旧消息用LLM生成摘要
    const KEEP_RECENT: usize = 20;
    if session.messages.len() <= KEEP_RECENT * 2 {
        return Ok(());
    }

    let old_messages: Vec<_> = session.messages.drain(..session.messages.len() - KEEP_RECENT).collect();
    let summary = generate_summary(&old_messages); // 调用LLM生成摘要

    // 将摘要作为系统消息插入
    session.messages.insert(0, Message::system(format!("Previous conversation summary: {}", summary)));
    Ok(())
}
```

### 7.4 Session与记忆的区别

| 维度 | Session | Semantic Memory |
|------|---------|-----------------|
| **目的** | 维护对话上下文 | 长期知识积累 |
| **内容** | 完整消息序列 | 提取的关键信息 |
| **生命周期** | 临时，可压缩 | 持久，需整理 |
| **查询方式** | 时间范围 | 语义相似度 |
| **典型数据** | "用户:你好 AI:你好" | "用户偏好Rust" |

**协作流程**：
1. 对话发生时，消息进入Session
2. 对话结束或触发条件，关键信息提取到Semantic Memory
3. 新对话开始时，从Session恢复近期上下文，从Memory检索相关知识

---

## 8. 动手练习

### 练习1: 实现自定义过滤器

为MemoryFilter添加`content_contains`字段，实现内容模糊匹配：

```rust
// 在 MemoryFilter 中添加
pub content_contains: Option<String>,

// 在 semantic.rs 的 recall 中应用
if let Some(ref contains) = filter.content_contains {
    sql.push_str(&format!(" AND content LIKE ?{param_idx}"));
    params.push(Box::new(format!("%{}%", contains)));
}
```

### 练习2: 批量记忆导入

实现从JSON文件批量导入记忆：

```rust
pub async fn import_memories_from_json(
    &self,
    path: &Path,
) -> OpenFangResult<usize> {
    let content = tokio::fs::read_to_string(path).await?;
    let memories: Vec<MemoryImport> = serde_json::from_str(&content)?;

    let mut count = 0;
    for mem in memories {
        self.remember(
            mem.agent_id,
            &mem.content,
            mem.source,
            &mem.scope,
            mem.metadata,
        ).await?;
        count += 1;
    }
    Ok(count)
}
```

### 练习3: 记忆统计面板

实现Agent记忆使用统计：

```rust
pub fn get_memory_stats(&self, agent_id: AgentId) -> OpenFangResult<MemoryStats> {
    let conn = self.conn.lock()?;

    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM memories WHERE agent_id = ?1 AND deleted = 0",
        params![agent_id.0.to_string()],
        |row| row.get(0),
    )?;

    let by_source: HashMap<String, i64> = /* 按source分组统计 */;
    let avg_confidence: f64 = /* 计算平均置信度 */;

    Ok(MemoryStats {
        total_memories: total,
        by_source,
        avg_confidence,
    })
}
```

---

## 总结

本章我们深入了解了OpenFang的内存系统：

1. **三层架构**分离了不同数据类型的存储需求
2. **Memory trait**提供了统一的存储抽象
3. **SQLite实现**平衡了简单性与功能性
4. **向量搜索**实现了语义检索能力
5. **知识图谱**支持结构化关系存储
6. **Session管理**维护了对话状态

**下一步**：第七章将介绍如何将这些组件整合，构建完整的Agent。

---

## 参考代码位置

- `crates/openfang-types/src/memory.rs` - Memory trait和数据类型定义
- `crates/openfang-memory/src/substrate.rs` - MemorySubstrate实现
- `crates/openfang-memory/src/semantic.rs` - 向量搜索实现
- `crates/openfang-memory/src/structured.rs` - KV存储实现
- `crates/openfang-memory/src/knowledge.rs` - 知识图谱实现
- `crates/openfang-memory/src/session.rs` - Session管理实现
- `crates/openfang-memory/src/migration.rs` - 数据库迁移定义
