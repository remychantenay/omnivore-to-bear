import { Database } from 'bun:sqlite';

export namespace DB {
  const DB_NAME = 'db.sqlite'
  const TABLE_NAME = 'exported_articles'
  
  const db = new Database(DB_NAME, { create: true })
  db.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id            TEXT       NOT NULL PRIMARY KEY,
      articleTitle  TEXT       NOT NULL,
      exportedAt    DATETIME   NOT NULL
    );
    `).run()
  
  export const Create = (id: string, title: string, exportedAt: number = Date.now()) => {
    return db.query(`
      INSERT INTO ${TABLE_NAME}
        (id, articleTitle, exportedAt) 
        VALUES('${id}', '${title}', ${exportedAt});
    `).run()
  }
  
  export const Get = (id: string) => {
    return db.query(`
      SELECT id FROM ${TABLE_NAME} 
        WHERE id == '${id}';
    `).get()
  }

  export const Truncate = () => {
    return db.query(`DELETE FROM ${TABLE_NAME} `).run()
  }
}

