import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Instance principale de l'application Express.
 *
 * C'est sur cet objet que l'on ajoute les middlewares et les routes HTTP de
 * l'API.
 *
 * @type {object}
 */
const app = express()

/**
 * Port HTTP utilisé par le serveur API.
 *
 * En production, la plateforme d'hébergement fournit souvent la variable
 * PORT. En développement local, on utilise 3000 par défaut.
 *
 * @type {string | number}
 */
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

/**
 * Route de vérification de l'état du serveur.
 *
 * Elle permet de confirmer rapidement que l'API démarre et répond, sans
 * interroger la base de données ni exécuter de logique métier.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'UrbanFlow Mobility API',
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
