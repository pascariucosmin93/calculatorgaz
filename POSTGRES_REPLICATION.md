# PostgreSQL: replicare fizică și failover

## Topologie activă

| Rol | Host | PostgreSQL | Observații |
|---|---|---:|---|
| Primary | `192.168.1.16` (`postgress`) | 18.4 | acceptă scrieri |
| Standby | `192.168.1.17` (`postgress-1`) | 18.6 | read-only, streaming replication |

Replica este fizică (streaming replication) și folosește slotul
`replica_17`. Utilizatorul de replicare este dedicat acestui scop și este
permis în `pg_hba.conf` numai de la `192.168.1.17`.

La configurare, masterul a raportat replica în starea `streaming`, iar pe
standby `pg_is_in_recovery()` a returnat `true`.

## Endpoint stabil pentru aplicații

| Nume DNS | VIP | Port | Proprietar curent |
|---|---|---:|---|
| `postgress.cosmin.home` | `192.168.1.18` | `5432` | primary-ul `.16` |

VIP-ul este gestionat de Keepalived în mod unicast între cele două noduri.
Verificarea Keepalived atribuie VIP-ul numai unui nod pentru care
`pg_is_in_recovery()` este `false`; un standby nu poate primi accidental
trafic de scriere.

Aplicațiile noi sau migrate trebuie să folosească endpointul stabil:

```text
postgresql://<user>:<parola>@postgress.cosmin.home:5432/<baza>
```

Nu configura aplicațiile cu `192.168.1.16` sau `192.168.1.17` direct.

## Verificare

Pe primary:

```bash
ssh root@192.168.1.16
sudo -u postgres psql -c "select application_name, client_addr, state, sync_state, write_lsn, replay_lsn from pg_stat_replication;"
```

Rezultatul trebuie să conțină clientul `192.168.1.17` cu `state = streaming`.

Pe standby:

```bash
ssh root@192.168.1.17
sudo -u postgres psql -c "select pg_is_in_recovery(), pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"
```

`pg_is_in_recovery` trebuie să fie `t` cât timp hostul este replica.

## Failover manual

Promovează replica **doar după ce ai confirmat că primary-ul `.16` este oprit
sau izolat din rețea**. Altfel pot exista două noduri care acceptă scrieri
(split-brain).

```bash
# Fence primary-ul vechi: oprește VM-ul sau, dacă este accesibil,
# oprește mai întâi PostgreSQL și Keepalived.
ssh root@192.168.1.16 'systemctl stop keepalived postgresql@18-main'

# Confirmă că VIP-ul nu mai este pe .16, apoi promovează standby-ul.
ssh root@192.168.1.17
sudo -u postgres psql -c "select pg_promote();"
```

Verifică promovarea:

```bash
sudo -u postgres psql -c "select pg_is_in_recovery();"
```

Rezultatul trebuie să fie `f`; `.17` poate accepta acum scrieri.
După promovare, verificarea Keepalived de pe `.17` reușește și atribuie
automat VIP-ul `192.168.1.18`. Aplicațiile se reconectează prin același nume
DNS, `postgress.cosmin.home`.

## După failover

1. Direcționează aplicațiile către `192.168.1.17` sau către un endpoint/VIP
   actualizat.
2. Nu reporni `.16` ca primary fără resynchronizare.
3. Pentru revenirea lui `.16` ca standby, folosește `pg_rewind` când este
   posibil sau inițializează-l din nou cu `pg_basebackup` de la noul primary.

## Nivelul actual de protecție

Replica este **asincronă**. În mod normal, tranzacțiile ajung imediat pe
standby, dar la o cădere bruscă a primary-ului ultimele tranzacții neexpediate
pot lipsi. Pentru zero pierdere de date se poate activa replicare sincronă;
aceasta face însă ca scrierile să aștepte replica și poate reduce
disponibilitatea dacă `.17` nu este accesibil.

Keepalived nu promovează automat standby-ul. Aceasta este intenționat: un
VIP singur nu poate stabili în siguranță dacă primary-ul este cu adevărat
oprit sau doar separat de rețea. Pentru failover automat fără split-brain este
necesar un mecanism de quorum/fencing, de exemplu Patroni cu trei membri etcd
sau Consul, plus un proxy/VIP controlat de acel mecanism.

## Integrarea cu CalculatorGaz

CalculatorGaz se conectează la baza de date prin secretul `database_url_app` (manifestele sunt în repo-ul `gaz-kube`).

Înainte de deploy, confirmă că baza `gaz` de pe primary conține datele care
trebuie servite. După deploy, verifică endpointul dintr-un pod din cluster și
confirmă că nodurile folosesc DNS-ul intern care poate rezolva
`postgress.cosmin.home`.

Următoarea îmbunătățire recomandată este mutarea credențialelor PostgreSQL
într-un Secret Kubernetes, nu într-un fișier versionat.
