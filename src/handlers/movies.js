import getProvider, {PROVIDER_TYPE} from '~/api/getProvider.js';

import buildCard from '~/lib/buildCard.js';
import buildReprompt from '~/lib/buildReprompt.js';
import getArtwork from '~/lib/getArtwork.js';
import parseDate from '~/lib/parseDate.js';
import buildDisplay from '~/lib/buildDisplay.js';

import {
  ADD_NOT_FOUND,
  ADD_PROMPT,
  ALREADY_WANTED,
  NO_MOVIE_FOUND,
  NO_MOVIE_SLOT
} from '~/responses/movies.js';

export async function handleFindMovieIntent(req, resp) {
  const movieName = req.slot('movieName');

  if (!movieName) {
    return Promise.resolve(resp.say(NO_MOVIE_SLOT()));
  }

  const api = getProvider(PROVIDER_TYPE.MOVIES);
  let movies = await api.list(movieName);

  if (!movies || !movies.length) {
    const query = buildQuery(req);
    resp.say(NO_MOVIE_FOUND(query));

    movies = await api.search(query);
    if (movies && movies.length) {
      const [topResult] = movies;

      resp
        .say(ADD_PROMPT(topResult.title, topResult.year))
        .session('promptData', buildReprompt(movies, PROVIDER_TYPE.MOVIES))
        .shouldEndSession(false);
    }

    return Promise.resolve(resp);
  }

  const [result] = movies;
  const responseText = ALREADY_WANTED(result.title, result.year);

  const artwork = await getArtwork(result);
  if (artwork) {
    resp.card(buildCard(`${result.title} (${result.year})`, artwork, responseText));
    if (hasDisplay(req)){
      resp.directive(buildDisplay(`${result.title} (${result.year})`, artwork, responseText, result.slug));
    }
  }

  return Promise.resolve(resp.say(responseText));
}

export async function handleAddMovieIntent(req, resp) {
  const movieName = req.slot('movieName');

  if (!movieName) {
    return Promise.resolve(resp.say(NO_MOVIE_SLOT()));
  }

  const api = getProvider(PROVIDER_TYPE.MOVIES);
  const query = buildQuery(req);
  const movies = await api.search(query);

  if (movies && movies.length) {
    const [topResult] = movies;
    const _prompt = ADD_PROMPT(topResult.title, topResult.year);
    resp
      .say(_prompt)
      .session('promptData', buildReprompt(movies, PROVIDER_TYPE.MOVIES))
      .shouldEndSession(false);

      const artwork = await getArtwork(topResult);

      if (artwork && hasDisplay(req)) {
        resp.directive(buildDisplay(`${topResult.title} (${topResult.year})`, artwork, _prompt, topResult.slug));
      }
  }
  else {
    resp.say(ADD_NOT_FOUND(movieName));
  }

  return Promise.resolve(resp);
}

function buildQuery(req) {
  const movieName = req.slot('movieName');
  const releaseDate = parseDate(req.slot('releaseDate'));

  return releaseDate ? `${movieName} ${releaseDate.year}` : movieName;
}

function hasDisplay(request) {
  const _hasDisplay = request.context && request.context.System && request.context.System.device && request.context.System.device.supportedInterfaces && request.context.System.device.supportedInterfaces.Display;
  if (_hasDisplay)
  {
    return true;
  }
  else
  {
    return false;
  }
}
