import { Database } from "sqlite3";

const db = new Database('s3-tooling.sqlite3');

db.serialize(()=>{
    db.get('select 1,2,3', (err, res) => {
        console.log(res);
    })
});

export class Db {
    #db = db;
}