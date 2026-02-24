# distra-rewrite

This project is rewritten to minimize vibecoded code, like those in the predecessor. Although there are some parts that are totally vibecoded (the S3 client package), the rest are not.

## Development setup

### Quickstart

```
git clone https://github.com/frolleks/distra-rewrite && cd distra-rewrite
bun install
bun run bootstrap
bun run db:migrate
bun run dev
```
