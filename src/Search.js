const clear = require("./clear");

function valueByType(str) {
  let n = Number(str);
  return isNaN(n) ? str : n;
}

// ?this=value&that[]=a&that[]=b
// ?this=:key+:property

function schemaArrayToString(key, value, schema) {
  let t = [];

  for (var i = 0, n = value.length; i < n; i++) {
    t.push([
      encodeURI(key) + "[]="
    ]);

    for (var x in value[i]) {
      t[i].push(value[i][x]);
    }

    t[i] = t[i][0] + encodeURI(t[i].slice(1).join(schema.delimiter));
  }

  return t.join("&");
}

function schemaObjectToString(key, value, schema) {
  let temp = [ key + "=", [] ];

  value = value || {};

  for (var i = 0, n = schema.map.length; i < n; i++) {
    if (schema.map[i].constant) {
      temp[1].push(schema.map[i].constant);
    } else if (value[schema.map[i]]) {
      temp[1].push(value[schema.map[i]]);
    }
  }

  return encodeURI(
    temp[0] + temp[1].join("+")
  );
}

export default class Search {
  constructor(schema, location) {
    this.isMatch  = true;
    this.schema   = {};
    this.keys     = [];

    this.setSchema(schema.search);
    this.setValue(location.search);
  }

  searchEach(raw, callback) {
    if (raw) {
      let str   = raw[0] === "?" ? raw.slice(1) : raw;
      let split = str.split("&").filter(a => a.length);

      for (var i = 0, n = split.length; i < n; i++) {
        let element = split[i].split("=");
        let isArray = element[0].slice(-2) === "[]";

        element[0] = decodeURI(element[0]);
        element[1] = decodeURI(element[1]);

        callback({
          key       : isArray ? element[0].slice(0, -2) : element[0],
          value     : element[1],
          delimiter : element[1] && element[1].indexOf(",") > -1 ? "," : "+",
          type      : isArray ? "array" : "object"
        });
      }
    }
  }

  setSchema(schema) {
    this.searchEach(schema, props => {
      props.map = [];
      if (props.value) {
        props.value.split(props.delimiter).forEach(name => {
          if (name[0] === ":") {
            props.map.push(name.substring(1));
          } else {
            props.map.push({ constant : name });
          }
        });
      }
      if (this.keys.indexOf(props.key) === -1) {
        this.keys.push(props.key);
      }
      this.schema[props.key] = props;
    });
  }

  setValue(search) {
    this.isMatch = !!search;
    this.searchEach(search, props => {
      const ref = this.schema[props.key];
      if (props.value && ref) {
        if (ref.map.length) {
          this.value[props.key] = {};
          props.value
            .split(ref.delimiter)
            .forEach((value, i) => {
              this.value[ref.map[i]] = valueByType(value);
            });
        } else {
          this.value[props.key] = valueByType(props.value);
        }
      } else {
        this.isMatch = false;
      }
    });
  }

  toString() {
    const search = [];
    for (let k in this) {
      if (this.hasOwnProperty(k) && !Search.prototype[k]) {
        if (this.schema[k] && this.schema[k].map.length) {
          if (this.schema[k].type === "array") {
            search.push(
              schemaArrayToString(k, this[k], this.schema[k])
            );
          } else if (this.schema[k].type === "object") {
            search.push(
              schemaObjectToString(k, this[k], this.schema[k])
            );
          }
        } else if (
          typeof this[k] === "number" ||
          (typeof this[k] === "string" && this[k].length)
        ) {
          search.push(
            encodeURI(k + "=" + this[k])
          );
        } else if (Array.isArray(this[k])) {
          for (var i = 0, n = this[k].length; i < n; i++) {
            search.push(
              encodeURI(k) + "[]=" + encodeURI(this[k][i])
            );
          }
        }
      }
    }

    return search.length
      ? "?" + search.join("&")
      : "";
  }

  set(props) {
    for (var k in props) {
      if (props.hasOwnProperty(k) && !Search.prototype[k]) {
        this[k] = props[k];
      } else if (Search.prototype[k]) {
        throw "Invalid property \"" + k + "\", this is a reserved key";
      }
    }
    return this;
  }

  get(key) {
    let props = {};
    if (typeof key === "object") {
      for (var i = 0, n = key.length; i < n; i++) {
        props[key[i]] = this.get(key[i]);
      }
      return props;
    }
    return this[key];
  }
}

Search.prototype.clear = clear;