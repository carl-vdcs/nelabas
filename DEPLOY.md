# Déployer Né là-bas sur nelabas.ecarlitobsm.com

Prérequis : Node 18+, le domaine ecarlitobsm.com géré dans ton compte Cloudflare (DNS orange).

```
cd nelabas
npx wrangler login        # une fois, ouvre le navigateur
npx wrangler deploy       # crée le Worker "nelabas", pousse ./public, crée le DNS nelabas.ecarlitobsm.com
```

Si ecarlitobsm.com n'est PAS sur Cloudflare : retire la clé "routes" de wrangler.jsonc, déploie,
puis ajoute chez ton registrar un CNAME nelabas → nelabas.<ton-sous-domaine>.workers.dev
(ou mieux, transfère la zone DNS sur Cloudflare, c'est gratuit).

Mise à jour : modifier les fichiers dans ./public puis `npx wrangler deploy`.
