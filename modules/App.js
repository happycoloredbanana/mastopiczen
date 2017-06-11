import React from 'react';
import { Button, FormGroup, ControlLabel, FormControl, Image } from 'react-bootstrap';
import MastodonAPI from '../vendor/mastodon.js/mastodon';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {instance: "", go: false};
  }

  onSubmit(event) {
    this.setState({go: !this.state.go});
    event.preventDefault();
  }

  onInstanceChange(event) {
    this.setState({
      instance: event.target.value,
      go: false
    });
  }

  render() {
    const instance = this.state.instance;
    const go = this.state.go;

    return (
        <div>
          <Config instance={instance} go={go}
            onInstanceChange={e => this.onInstanceChange(e)}
            onSubmit={e => this.onSubmit(e)} />
          <hr />
          <Grid instance={instance} go={go}/>
        </div>
    );
  }
}

class Config  extends React.Component {
  constructor(props) {
    super(props);
    this.onInstanceChange = props.onInstanceChange;
    this.onSubmit = props.onSubmit;
  }

  render() {
    return (
      <form style={{width: '50%', margin: 'auto'}} onSubmit={e => this.onSubmit(e)}>
        <FormGroup>
          <ControlLabel> Instance </ControlLabel>
          <FormControl type='text' value={this.props.instance} onChange={e => this.onInstanceChange(e)} />
        </FormGroup>
        <Button bsStyle='primary' type='submit'> {this.props.go ? 'Stop' : 'Go'} </Button>
      </form>
    );
  }
}

class Grid extends React.Component {
	constructor(props) {
    super(props);
    this.requestsInFlight = 0;
    this.clear();
  }

  clear() {
    this.state = { pics: [] };
    this.picQueueOld = [];
    this.picQueueNew = [];
    delete this.maxId;
    delete this.minId;
    delete this.scrollToTop;
  }

  componentDidMount() {
    if (this.props.go) {
      this.startRetrieval();
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.go && nextProps.go) {
      if(this.lastInstance != nextProps.instance) {
        this.clear();
      }
      this.startRetrieval();
    } else if (this.props.go && !nextProps.go) {
      this.stopRetrieval();
    }
  }

  startRetrieval() {
    console.log('started');
    this.lastInstance = this.props.instance;
    this.api = new MastodonAPI({
      instance: 'https://' + this.props.instance
    });
    
    this.tick();
		this.timerId = setInterval(
      () => this.tick(),
      3000
    );
  }

	componentWillUnmount() {
    if (this.props.go) {
      this.stopRetrieval();
    }
  }

  stopRetrieval() {
    console.log('stopped');
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    delete this.api;
  }

  onUpdate(statuses, isOldStuff, instance) {
    if (this.props.instance !== instance) {
      return;
    }

    if (!this.props.go) {
      return;
    }

    if (!isOldStuff) {
      statuses.reverse();
    }

    for (var stat of statuses) {
      for (var media of stat.media_attachments) {
        if (media.type === 'image') {
          const newPic = {
            url:        stat.url,
            previewUrl: media.preview_url,
            text:        stat.id, //stat.content,
            id:         media.id
          };

          if(media.meta && media.meta.small) {
            newPic.height = media.meta.small.height;
            newPic.width = media.meta.small.width;
          }

          if (isOldStuff) {
            this.picQueueOld.push(newPic);
          } else {
            this.picQueueNew.push(newPic);
          }
        }
      }
      
      if (!this.maxId || this.maxId < stat.id) {
        this.maxId = stat.id;
      }

      if (!this.minId || this.minId > stat.id) {
        this.minId = stat.id;
      }
    }
    console.log('max: ' + this.maxId + ', min: ' + this.minId);
  }

	tick() {
    console.log('tick ');
    if (this.picQueueNew.length === 0 && this.picQueueOld.length === 0) {
      this.retrieveMoreStatuses();
    } else {
      var pics = this.state.pics;
      if (this.picQueueNew.length > 0) {
        var pic = this.picQueueNew.shift();
        pics.unshift(pic);
        this.scrollToTop = true;
      } else if (this.picQueueOld.length > 0) {
        var pic = this.picQueueOld.shift();
        pics.push(pic);
        this.scrollToTop = false;
      }
      this.setState( { pics: pics } );
    }
  }

  runRequest(query, isOldStuff) {
    ++this.requestsInFlight;
    this.api.get('timelines/public', query,
      data => this.onUpdate(data, isOldStuff, this.props.instance)
    ).always(() => --this.requestsInFlight);
  }

  retrieveMoreStatuses() {
    if (this.requestsInFlight > 0) {
      console.log('still waiting for requests');
      return;
    }

    var query = { local: 1 };
    if (this.minId) {
      query.max_id = this.minId;
    }
    this.runRequest(query, true);

    if (this.maxId) {
      this.runRequest({ since_id: this.maxId, local: 1 }, false);
    }
  }

  componentDidUpdate() {
    if (this.props.go &&
        typeof this.scrollToTop !== 'undefined') {
      this.gridNode.scrollIntoView(this.scrollToTop);
    }
  }

  render() {
    const pics = this.state.pics.map(
      (pic) => 
        <a key={pic.id} href={pic.url} target="_blank">
          <Image src={pic.previewUrl} title={pic.text} width={pic.width} height={pic.height} />
        </a>
    );

    return (
      <div ref={e => this.gridNode = e}>
        {pics}
      </div>
    )
  }
}


export { App };
