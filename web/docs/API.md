# Velox API Reference

> Documentazione snella per uso interno - Non è necessario OpenAPI/Swagger

---

## Core API

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/jobs` | Lista tutti i job |
| `GET` | `/api/v1/jobs/:jobId` | Dettaglio job |
| `DELETE` | `/api/v1/jobs/:jobId` | Elimina job |
| `POST` | `/api/v1/jobs/:jobId/retry` | Riprova job fallito |
| `POST` | `/cleanup_queue` | Elimina tutti i job pending |
| `POST` | `/cleanup_processing` | Elimina job in esecuzione |

**Response:**
```json
{
  "jobs": [
    {
      "job_id": "abc123",
      "video_name": "video.mp4",
      "status": "PROCESSING",
      "created_at": "2026-01-01T00:00:00Z",
      "error_message": null
    }
  ]
}
```

---

## Workers

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/workers` | Lista worker |
| `GET` | `/api/v1/workers/status` | Stato worker |
| `GET` | `/api/v1/workers/:id/logs` | Log worker |

---

## YouTube

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/youtube/channels` | Lista canali |
| `GET` | `/api/v1/youtube/groups` | Lista gruppi |
| `POST` | `/api/v1/youtube/groups` | Crea gruppo |
| `DELETE` | `/api/v1/youtube/groups/:name` | Elimina gruppo |
| `POST` | `/api/v1/youtube/upload` | Upload video |
| `POST` | `/api/v1/youtube/ai/titles` | Genera titoli AI |
| `POST` | `/api/v1/youtube/ai/description` | Genera descrizione AI |
| `POST` | `/api/v1/youtube/ai/tags` | Genera tags AI |

---

## Drive

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/drive/files` | Lista file |
| `POST` | `/api/drive/upload` | Upload file |
| `POST` | `/api/drive/create-folder` | Crea cartella |
| `GET` | `/api/drive/accounts` | Lista account |

---

## Queue

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/queue/job` | Prossimo job per worker |
| `POST` | `/api/queue/submit` | Submit nuovo job |
| `POST` | `/api/queue/complete` | Completa job |
| `POST` | `/api/queue/fail` | Segna job come fallito |
| `GET` | `/api/queue/metrics` | Metriche queue |
| `GET` | `/api/queue/dlq` | Dead letter queue |

---

## Livestream

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/livestream` | Lista livestreams |
| `POST` | `/api/v1/livestream` | Crea livestream |
| `POST` | `/api/v1/livestream/:id/testing` | Avvia test |
| `POST` | `/api/v1/livestream/:id/live` | Vai live |
| `POST` | `/api/v1/livestream/:id/complete` | Termina stream |

---

## Bundle

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/bundle/info` | Info bundle |
| `GET` | `/api/bundle/files` | Lista file bundle |
| `POST` | `/install_worker/force_regenerate_zip` | Rigenera bundle |

---

## Server

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/server/status` | Stato server |
| `GET` | `/api/master/code-version` | Versione codice |

---

## Ansible

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/ansible/computers` | Lista computer |
| `POST` | `/ansible/computers` | Aggiungi computer |
| `DELETE` | `/ansible/computers/:id` | Rimuovi computer |
| `POST` | `/ansible/computers/test_ssh` | Test SSH |
| `POST` | `/ansible/computers/run_action` | Esegui azione |

---

## Status Codes

| Code | Significato |
|------|-------------|
| `200` | OK |
| `400` | Bad Request |
| `401` | Unauthorized |
| `404` | Not Found |
| `429` | Rate Limited |
| `500` | Server Error |

---

## Error Response

```json
{
  "error": "Job not found",
  "reason": "Job abc123 does not exist"
}
```

---

## Autenticazione

L'API usa session-based auth. Non richiede API key per uso locale.

---

## Quick Reference

```bash
# Test connessione
curl http://localhost:8000/api/server/status

# Lista job
curl http://localhost:8000/api/v1/jobs

# Lista worker
curl http://localhost:8000/api/v1/workers/status
```
