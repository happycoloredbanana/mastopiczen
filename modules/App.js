import React from 'react';
import PropTypes from 'prop-types';
import { Button, FormGroup, ControlLabel, FormControl, Image, Checkbox } from 'react-bootstrap';
import MastodonAPI from '../vendor/mastodon.js/mastodon';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { instance: '', go: false, autoscroll: true };
  }

  onSubmit(event) {
    this.setState({ go: !this.state.go });
    event.preventDefault();
  }

  onInstanceChange(event) {
    this.setState({
      instance: event.target.value,
      go: false,
    });
  }

  onAutoscrollChange(event) {
    this.setState({
      autoscroll: event.target.checked,
    });
  }

  render() {
    const instance = this.state.instance;
    const go = this.state.go;
    const autoscroll = this.state.autoscroll;

    return (
      <div>
        <Grid instance={instance} go={go} autoscroll={autoscroll} />
        <hr />
        <Config
          instance={instance}
          go={go}
          autoscroll={autoscroll}
          onInstanceChange={e => this.onInstanceChange(e)}
          onAutoscrollChange={e => this.onAutoscrollChange(e)}
          onSubmit={e => this.onSubmit(e)}
        />
      </div>
    );
  }
}

class Config extends React.Component {
  constructor(props) {
    super(props);
    this.onInstanceChange = props.onInstanceChange;
    this.onAutoscrollChange = props.onAutoscrollChange;
    this.onSubmit = props.onSubmit;
  }

  render() {
    return (
      <form style={{ width: '50%', margin: 'auto' }} onSubmit={e => this.onSubmit(e)}>
        <FormGroup>
          <ControlLabel> Instance </ControlLabel>
          <FormControl
            type='text'
            value={this.props.instance}
            onChange={e => this.onInstanceChange(e)}
          />
        </FormGroup>
        <FormGroup>
          <Checkbox
            checked={this.props.autoscroll}
            onChange={e => this.onAutoscrollChange(e)}
          >
            Autoscroll
          </Checkbox>
        </FormGroup>
        <Button bsStyle='primary' type='submit'> {this.props.go ? 'Stop' : 'Go'} </Button>
      </form>
    );
  }
}
Config.propTypes = {
  instance: PropTypes.string.isRequired,
  go: PropTypes.bool.isRequired,
  autoscroll: PropTypes.bool.isRequired,
  onInstanceChange: PropTypes.func.isRequired,
  onAutoscrollChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};


class Grid extends React.Component {
  constructor(props) {
    super(props);
    this.requestsInFlight = 0;
    this.clear();
  }

  componentDidMount() {
    if (this.props.go) {
      this.startRetrieval();
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.go && nextProps.go) {
      if (this.lastInstance !== nextProps.instance) {
        this.clear();
      }
      this.startRetrieval();
    } else if (this.props.go && !nextProps.go) {
      this.stopRetrieval();
    }
  }

  componentDidUpdate() {
    if (this.props.go &&
        this.props.autoscroll &&
        typeof this.scrollToTop !== 'undefined') {
      this.gridNode.scrollIntoView(this.scrollToTop);
    }
  }

  componentWillUnmount() {
    if (this.props.go) {
      this.stopRetrieval();
    }
  }

  startRetrieval() {
    this.lastInstance = this.props.instance;
    this.api = new MastodonAPI({
      instance: `https://${this.props.instance}`,
    });

    this.tick();
    this.timerId = setInterval(
      () => this.tick(),
      3000,
    );
  }

  stopRetrieval() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    delete this.api;
  }

  clear() {
    this.state = { pics: [] };
    this.picQueueOld = [];
    this.picQueueNew = [];
    delete this.maxId;
    delete this.minId;
    delete this.scrollToTop;
  }

  processStatuses(statuses, isOldStuff, instance) {
    if (this.props.instance !== instance) {
      return;
    }

    if (!this.props.go) {
      return;
    }

    if (!isOldStuff) {
      statuses.reverse();
    }

    for (const stat of statuses) {
      for (const media of stat.media_attachments) {
        if (media.type !== 'image') {
          continue;
        }

        const newPic = {
          url: stat.url,
          previewUrl: media.preview_url,
          text: stat.id,
          id: media.id,
        };

        if (media.meta && media.meta.small) {
          newPic.height = media.meta.small.height;
          newPic.width = media.meta.small.width;
        }

        if (isOldStuff) {
          this.picQueueOld.push(newPic);
        } else {
          this.picQueueNew.push(newPic);
        }
      }
      this.keepTrackOfMinAndMax(stat.id);
    }
  }

  keepTrackOfMinAndMax(id) {
    if (!this.maxId || this.maxId < id) {
      this.maxId = id;
    }

    if (!this.minId || this.minId > id) {
      this.minId = id;
    }
  }

  tick() {
    if (this.picQueueNew.length === 0 && this.picQueueOld.length === 0) {
      this.retrieveMoreStatuses();
    } else {
      const pics = this.state.pics;
      if (this.picQueueNew.length > 0) {
        const pic = this.picQueueNew.shift();
        pics.unshift(pic);
        this.scrollToTop = true;
      } else if (this.picQueueOld.length > 0) {
        const pic = this.picQueueOld.shift();
        pics.push(pic);
        this.scrollToTop = false;
      }
      this.setState({ pics: pics });
    }
  }

  runRequest(query, isOldStuff) {
    this.requestsInFlight += 1;
    this.api.get(
      'timelines/public',
      query,
      data => this.processStatuses(data, isOldStuff, this.props.instance),
    ).always(() => { this.requestsInFlight -= 1; });
  }

  retrieveMoreStatuses() {
    if (this.requestsInFlight > 0) {
      return;
    }

    const query = { local: 1 };
    if (this.minId) {
      query.max_id = this.minId;
    }
    this.runRequest(query, true);

    if (this.maxId) {
      this.runRequest({ since_id: this.maxId, local: 1 }, false);
    }
  }

  render() {
    const pics = this.state.pics.map(pic => (
      <a key={pic.id} href={pic.url} target='_blank' rel='noopener noreferrer'>
        <Image src={pic.previewUrl} title={pic.text} width={pic.width} height={pic.height} />
      </a>
    ));

    return (
      <div ref={(e) => { this.gridNode = e; }}>
        {pics}
      </div>
    );
  }
}
Grid.propTypes = {
  instance: PropTypes.string.isRequired,
  go: PropTypes.bool.isRequired,
  autoscroll: PropTypes.bool.isRequired,
};


export { App as default };
