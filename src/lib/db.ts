// This site's own MongoDB database (MONGODB_URI, database MONGODB_DB, by
// default "lhdcarswanted"). Never another project's database: the server
// may be shared, the database never is. Without MONGODB_URI the public pages
// read data/cars.json instead, and the admin says it isn't set up.
import "./env.ts";
import { MongoClient, type Db } from "mongodb";

let client: Promise<MongoClient> | undefined;

export const hasDb = () => Boolean(process.env.MONGODB_URI);

export async function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  client ??= MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 }).catch((e) => {
    client = undefined; // try again on the next request
    throw e;
  });
  return (await client).db(process.env.MONGODB_DB || "lhdcarswanted");
}
