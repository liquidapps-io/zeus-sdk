import React, { Component } from 'react';
// import { Rpc } from 'eosjs2'; // https://github.com/EOSIO/eosjs2

// material-ui dependencies
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

// const theme = createMuiTheme({
  // palette: {
  //   type: 'dark',
  // },
// });

// set up styling classes using material-ui "withStyles"
const styles = theme => ({
  paper: {
    ...theme.mixins.gutters(),
    paddingTop: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit * 2,
  },
  formButton: {
    marginTop: theme.spacing.unit,
    width: "100%",
  },
  pre: {
    // background: "#eee",
    padding: 4,
    marginBottom: 0.
  }
});

// Index component
class Index extends Component {
  constructor(props) {
    super(props)
    this.state = {
    };
  }


  componentDidMount() {
  }


  render() {
    let { loading } = this.state;
    var loader = loading ? <img src="loader.svg"/> : <span/>
    return (
      // <MuiThemeProvider theme={theme}>
        <div style={{height: "100%", width: "100%"}}>
          <AppBar position="static" style={{background:"#dddddd"}} >
            <Toolbar>
              <div style={{"display": "flex", "alignItems":"center"}} >
                <img alt='logo' src="eos-logo.png" width="64" height="64"/> 
                <Typography variant="title" color="inherit">
                  <div style={{"marginLeft":"15px", color:"black"}}> </div>
                </Typography>
              </div>
            </Toolbar>
          </AppBar>
        
        <br/>
          {loader}
        </div>
      // </MuiThemeProvider>
    );
  }

}

export default withStyles(styles)(Index);
