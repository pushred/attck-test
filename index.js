const UID = window.shortid.generate;
const {BrowserRouter, Route, Link} = window.ReactRouterDOM;
const {kebabcase, sortby} = window.lodash;

let sortBy = sortby;

const data = {
  "characters": [{
    "name": "Luke Skywalker",
    "url": "https://swapi.co/api/people/1/"
  }, {
    "name": "Darth Vader",
    "url": "https://swapi.co/api/people/4/"
  }, {
    "name": "Obi-wan Kenobi",
    "url": "https://swapi.co/api/people/unknown/" // TODO: get the ID
  }, {
    "name": "R2-D2",
    "url": "https://swapi.co/api/people/2/" // id 2 is C-3PO!
  }]
};

function App () {
  let characterLinks = data.characters.reduce((links, character) => {
    let id = parseId(character.url);
    let slug = kebabcase(character.name);

    return links.concat({
      name: character.name,
      path: id && `/${id}/${slug}`
    });
  }, []);

  return (
    <BrowserRouter>
      <main className="Main">
        <header>Star Wars</header>

        <ul className="CharacterList">
          {characterLinks.map(props => <Character key={UID()} {...props} />)}
        </ul>

        <Route path="/:id/:slug" component={MovieList} />

      </main>
    </BrowserRouter>
  );
}

function Character ({name, path}) {
  return (
    <li className="CharacterList__item Character">
      {path
        ? <Link className="Character__link" to={path}>{name}</Link>
        : name}
    </li>
  );
}

class MovieList extends React.Component {
  constructor () {
    super();
    this.state = {
      characters: {},
      movies: {}
    };
    this.getMovies.bind(this);
  }

  getMovies (characterId) {
    var movieIds;

    // fetch list of films for character, then fetch data for each film
    fetch('https://swapi.co/api/people/' + characterId)
      .then(res => res.json())
      .then(data => {
        movieIds = data.films.map(url => parseId(url));

        return Promise.all(
          data.films
            // only fetch films if they haven't been already
            .filter(url => !Object.keys(this.state.movies).includes(parseId(url)))
            .map(url => fetch(url).then(res => res.json()))
        );
      })
      .then(data => {
        let movies = Object.assign({},
            this.state.movies,
            data.reduce((movies, movie) => {
              movies[parseId(movie.url)] = {
                title: movie.title,
                releaseDate: movie.release_date,
                openingCrawl: movie.opening_crawl,
                episodeId: movie.episode_id
              };

              return movies;
            }, {})
        );

        // sort movies by episode # (API order seems arbitrary)
        let movieIdsByEpisode = sortBy(movieIds, id => movies[id].episodeId);

        // data is fetched once, then cached in component state
        this.setState({
          characters: Object.assign(this.state.characters, {
            [characterId]: movieIdsByEpisode
          }),
          movies
        })
      })
      .catch(alert);
  }

  render () {
    let {id} = this.props.match.params;
    let movieList = this.state.characters[id];

    if (!movieList) {
      this.getMovies(id);
      return <em>Loading</em>;
    }

    let movieData = movieList.map(id => this.state.movies[id]);

    return (
      <section className="MovieList">
        <h2>Filmography</h2>
        {movieData.map(props => <Movie key={UID()} {...props} />)}
      </section>
    );
  }
}

function Movie ({title, releaseDate}) {
  // PST timezone offset avoids inconsistencies due to local tz conversion
  let formattedReleaseDate = dateFns.format(releaseDate + 'T00:00:00−7:00', 'dddd, MMMM D YYYY');

  return (
    <section className="MovieList__item Movie">
      <h3 className="Movie__title">{title}</h3>
      <time className="Movie__release" dateTime={releaseDate}>{formattedReleaseDate}</time>
    </section>
  );
}

function parseId (url) {
  return url.split('/').find(segment => parseInt(segment, 10));
}

document.addEventListener('DOMContentLoaded', () => {
  window.ReactDOM.render(<App />, document.getElementById('root'));
});
