const UID = window.shortid.generate;
const {BrowserRouter, Route, NavLink} = window.ReactRouterDOM;
const {kebabcase, sortby} = window.lodash;
const TransitionGroup = window.React.addons.CSSTransitionGroup;

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

  let props = {
    transition: {
      transitionName: 'wipe',
      transitionEnterTimeout: 1000,
      transitionLeaveTimeout: 1000,
      component: 'div',
      className: 'Movies'
    }
  };

  return (
    <BrowserRouter>
      <main className="Main">
        <header className="Header">
          <h1 className="Brand">SWDB</h1>
        </header>

        <div className="Main__content">
          <section className="Characters">
            <h2 className="Heading">Choose a Character</h2>
            <ul className="CharacterList">
              {characterLinks.map(props => <Character key={UID()} {...props} />)}
            </ul>
          </section>
          <Route render={({location}) => (
            <MovieProvider id={location}>
              <TransitionGroup {...props.transition} >
                <Route path="/:id/:slug" render={props => <MovieProvider {...props} />} location={location} key={location.key} />
              </TransitionGroup>
            </MovieProvider>
          )}/>
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

class MovieProvider extends React.Component {
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
    fetch('https://swapi.co/api/people/' + characterId + '/')
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
          characters: Object.assign({}, this.state.characters, {
            [characterId]: {
              name: DATA.characters.find(c => parseId(c.url) === characterId).name,
              movies: movieIdsByEpisode
            }
          }),
          movies
        })
      })
      .catch(alert);
  }

  render () {
    let {id} = this.props.match.params;
    if (!id || !parseInt(id, 10)) return null; // CodePen's own router supplying a 'boomerang' value sometimes?

    let characterData = this.state.characters[id];

    if (!characterData) {
      this.getMovies(id);
      return null; // intentionally optimistic loader
    }

    let movieData = characterData.movies.map(id => this.state.movies[id]);

    return <MovieList movies={movieData} />;
  }
}

function MovieList ({movies}) {
  if (!movies) return null;

  return (
    <section className="MovieList">
      {movies.map(props => <Movie key={UID()} {...props} />)}
    </section>
  );
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
