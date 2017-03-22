const UID = window.shortid.generate;
const {BrowserRouter, Route, NavLink} = window.ReactRouterDOM;
const {kebabcase, sortby} = window.lodash;

let sortBy = sortby;

const DATA = {
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

const ROMANS = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII'
};

function App () {
  let characterLinks = DATA.characters.reduce((links, character) => {
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
        <h1 className="Brand">SWDB</h1>

        <div className="Main__content">
          <section className="Characters">
            <h2 className="Heading">Choose a Character</h2>
            <ul className="CharacterList">
              {characterLinks.map(props => <Character key={UID()} {...props} />)}
            </ul>
          </section>

          <Route path="/:id/:slug" component={MovieList} location={location} key={location.key} />
        </div>
      </main>
    </BrowserRouter>
  );
}

function Character ({name, path}) {
  var className = 'CharacterList__item Character';
  if (!path) className += ' Character--error';

  return (
    <li className={className}>
      {path
        ? <NavLink className="Character__link" activeClassName="Character__link--active" to={path}>{name}</NavLink>
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

        let requests = data.films
            // only fetch films if they haven't been already
            .filter(url => !Object.keys(this.state.movies).includes(parseId(url)))
            .map(url => fetch(url).then(res => res.json()));

        if (requests) {
          document.body.classList.add('is-loading');
          return Promise.all(requests);
        } else {
          return Promise.all();
        }
      })
      .then(data => {
        document.body.classList.remove('is-loading');

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
            [characterId]: {
              name: DATA.characters.find(c => parseId(c.url) === characterId).name,
              movies: movieIdsByEpisode
            }
          }),
          movies
        });
      })
      .catch(alert);
  }

  render () {
    let {id} = this.props.match.params;

    if (!this.state.characters[id]) {
      this.getMovies(id);
      return null; // intentionally optimistic loader
    }

    let {name, movies} = this.state.characters[id];
    let movieData = movies.map(id => this.state.movies[id]);

    return (
      <section className="MovieList">
        {movieData.map(props => <Movie key={UID()} {...props} />)}
      </section>
    );
  }
}

function Movie ({title, releaseDate, episodeId}) {
  // PST timezone offset avoids inconsistencies due to local tz conversion
  let formattedReleaseDate = dateFns.format(releaseDate + 'T00:00:00−7:00', 'dddd, MMMM D YYYY');

  return (
    <section className={`MovieList__item Movie Movie--episode-${episodeId}`}>
      <h3 className="Movie__title">{title}</h3>
      <h4 className="Movie__episode" title={"Episode " + episodeId}>{ROMANS[episodeId]}</h4>
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
