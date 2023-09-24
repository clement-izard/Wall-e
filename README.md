# Wall-e

## -------- Français --------

## Introduction

Wall-e, un outil simple conçu pour récupérer et télécharger sans effort vos séries TV préférées sur wawacity.

L'url actuelle de wawacity est sur telegram: https://web.telegram.org/a/#-1805550741

## Fonctionnalités

1. **Téléchargement Automatisé de Séries**: Une fois configuré, l'outil récupérera automatiquement les liens de téléchargement pour tous les épisodes de la série et de ses saisons pour un qualité déterminée, puis les téléchargera.
2. **Téléchargement Parallèle**: Plusieurs épisodes sont téléchargés en parallèle pour une finalisation plus rapide. Maximum 15 téléchargements en parallèle pour ne pas surcharger Alldebrid.
3. **Déblocage des Liens**: L'outil s'intègre à AllDebrid pour débloquer et fournir des liens de téléchargement directs.
4. **Stockage Organisé**: Les épisodes téléchargés sont soigneusement organisés dans des dossiers par nom de série et par saison.
5. **Doublons**: L'outil ne téléchargera pas les épisodes déjà présents dans le dossier de stockage.

## Problèmes Connus

Parfois l'api d'alldebrid renvoie une erreur quand on lui demande de débloquer un lien.
Les liens en erreur seront affichés à la fin des téléchargements, vous pourrez soit: 
- Les copier/coller pour les renvoyer sur la plateforme d'Alldebrid.
- Relancer le script avec les mêmes paramètres : il ne téléchargera que les épisodes qui n'ont pas été téléchargés.

## Installation & Configuration

### Prérequis :

1. **Node.js**: Assurez-vous d'avoir Node.js installé sur votre système. Sinon, téléchargez et installez-le depuis [le site officiel de Node.js](https://nodejs.org/).

### Étapes :

1. **Cloner le Répertoire**:

   Ouvrez votre terminal ou invite de commande et exécutez :

   ```bash
   git clone https://github.com/lien-de-votre-repo-ici.git
   ```

2. **Naviguez vers le Répertoire du Projet**:

   ```bash
   cd telechargeur-de-series
   ```

3. **Installez les Dépendances** :

   Exécutez la commande suivante pour installer les bibliothèques requises :

   ```bash
   npm install
   ```

4. **Configurer le fichier .env**:

   Créez un fichier `.env` à la racine du répertoire du projet. Vous pouvez utiliser `.env.template` comme référence. Remplissez les champs nécessaires :

    - `ALLDEBRID_AGENT_NAME`: Le nom de l'agent.
    - `ALLDEBRID_KEY`: La clé API de l'agent.
    - `ALLDEBRID_ENDPOINT`: L'endpoint pour l'API AllDebrid. (Par défaut : http://api.alldebrid.com/v4)
    - `BASE_DIRECTORY`: Le dossier où vous souhaitez sauvegarder vos séries.
    - `WAWACITY_BASE`: L'URL de base pour Wawacity. (Par défaut : https://www.wawacity.pink)
    - `WAWACITY_SERIE_URL`: L'URL complète de la série que vous souhaitez télécharger.

5. **Lancez l'Outil**:

   Une fois le fichier `.env` configuré, vous pouvez lancer l'outil avec :

   ```bash
   node index.js
   ```

   Asseyez-vous et regardez l'outil récupérer et télécharger la série pour vous!

## Dons

Si vous avez trouvé cet outil utile et souhaitez soutenir son développement, envisagez de faire un don :

[//]: # (- **BTC**: `Your BTC Address Here`)
- **ETH**: `0x0D04Bcc46e0f8B2636b3169e0d0Acb5e485e7712`

[//]: # (- **XMR**: `Your XMR Address Here`)

Votre soutien est grandement apprécié!

## Dernière note

Cet outil est à des fins éducatives uniquement. Je ne suis pas responsable de tout mauvais usage de cet outil.

---

---

## -------- English --------

## Introduction

Welcome to the Wall-e, a simple tool designed for effortlessly fetching and downloading your favorite TV series on wawacity.

Current wawacity url can be found on their telegram: https://web.telegram.org/a/#-1805550741

## Features

1. **Automated Series Download**: Once set up, the tool will automatically retrieve download links for all episodes of the series and its seasons in the initial quality, and download them.
2. **Parallel Download**: Multiple episodes are downloaded concurrently for faster completion. 15 downloads in parallel maximum to not overload Alldebrid.
3. **Link Unlocking**: The tool integrates with AllDebrid to unlock and provide direct download links.
4. **Organized Storage**: Downloaded episodes are neatly organized into folders by series name and season.
5. **Avoid double download**: The tool will not download episodes that are already present in the storage folder.

## Known issues

Sometimes the alldebrid api return an error when asked to unlock a link.
The links in error will be displayed at the end of the downloads, you can either:
- Copy/paste them to send them back to the Alldebrid platform.
- Restart the script with the same parameters: it will only download the episodes that have not been downloaded.

## Installation & Setup

### Prerequisites:

1. **Alldebrid** account: You need a paid Alldebrid account to use this tool. If you don't have one, create it at [Alldebrid official website](https://alldebrid.com/).
1. **Node.js**: Ensure you have Node.js installed on your system. If not, download and install it from [Node.js official website](https://nodejs.org/).

### Steps:

1. **Clone the Repository**:

   Open your terminal or command prompt and run:

   ```bash
   git clone https://github.com/clement-izard/Wall-e
   ```

2. **Navigate to the Project Directory**:

   ```bash
   cd wall-e
   ```

3. **Install Dependencies**:

   Run the following command to install the required libraries:

   ```bash
   npm install
   ```

4. **Setup .env File**:

   Create a `.env` file in the root of the project directory. You can use the `.env.template` as a reference. Fill in the necessary fields:

    - `ALLDEBRID_AGENT_NAME`: The name of the agent.
    - `ALLDEBRID_KEY`: The API key of the agent.
    - `ALLDEBRID_ENDPOINT`: The endpoint for the AllDebrid API. (Default: http://api.alldebrid.com/v4)
    - `BASE_DIRECTORY`: The folder where you want to save your series.
    - `WAWACITY_BASE`: The base URL for Wawacity. (Default: https://www.wawacity.pink)
    - `WAWACITY_SERIE_URL`: The complete URL for the series you want to download.

5. **Run the Tool**:

   Once you've set up the `.env` file, you can run the tool with:

   ```bash
   node index.js
   ```

   Sit back and watch as the tool fetches and downloads the series for you!

## Donations

If you found this tool helpful and would like to support its development, consider making a donation:

[//]: # (- **BTC**: `Your BTC Address Here`)
- **ETH**: `0x0D04Bcc46e0f8B2636b3169e0d0Acb5e485e7712`

[//]: # (- **XMR**: `Your XMR Address Here`)

Your support is greatly appreciated!

## Last note

This tool is for educational purposes only. I am not responsible for any misuse of this tool.


---

## Technical notes:

Javascript was chosen over typescript because of the size of this project.
It's a simple script that doesn't need to be compiled and typescript would have added a lot of boilerplate code.

The script is written in a functional way, using the functional programming paradigm.

I wanted to make is as accessible as possible, this way if someone wants to add a feature, it will be easier for him/her to understand the code.
