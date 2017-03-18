const UID = shortid.generate;
const {BrowserRouter, Route, Link} = ReactRouterDOM;
const {kebabcase} = lodash;

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
    "url": "https://swapi.co/api/people/2/"
  }]
};

function App () {
  let characterLinks = data.characters.reduce((links, character) => {
    let id = character.url.split('/').find(parseInt);
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
    this.state = {};
    this.getMovies.bind(this);
  }

  getMovies (id) {
    // fetch list of films for character, then fetch data for each film
    fetch('https://swapi.co/api/people/' + id)
      .then(res => res.json())
      .then(data => Promise.all(
        data.films.map(url => fetch(url).then(res => res.json()))
      ))
      .then(data => {
        let movies = data.map(movie => {
          return {
            title: movie.title,
            releaseDate: movie.release_date,
            openingCrawl: movie.opening_crawl,
            episodeId: movie.episode_id
          }
        });

        // data is fetched once, then cached in component state
        this.setState({ [id]: movies })
      })
      .catch(alert);
  }

  render () {
    let {id} = this.props.match.params;
    let data = this.state[id];

    if (!data) {
      this.getMovies(id);
      return <em>Loading</em>;
    }

    return (
      <section className="MovieList">
        <h2>Filmography</h2>
        {data.map(props => <Movie key={UID()} {...props} />)}
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

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<App />, document.getElementById('root'));
});
