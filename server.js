const express = require('express');
const axios = require('axios');
const _ = require('lodash');
const app = express();
const port = 3000; 

function analyticResolver(...args) {
  const now = new Date();
  const key = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}-${now.getHours()}-${now.getMinutes()}-${Math.floor(
    now.getSeconds() / 20
  ) * 10}`;
  return key;
}
function searchResolver(...args) {
  const now = new Date();
  const key = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}-${now.getHours()}-${now.getMinutes()}-${Math.floor(
    now.getSeconds() / 10
  ) * 10}-${args[0]}`;
  return key;
}

// axios endpoints

function analytics(){
  const promise = new Promise((resolve,reject)=>{
    axios.get('https://intent-kit-16.hasura.app/api/rest/blogs', {
      headers: {
        'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6'
      }
    }).then((response)=>{
      console.log("in analytics function");
      const blogs = response.data.blogs;
      const totalBlogs = blogs.length;
      const longestBlog = _.maxBy(blogs, 'title.length');   
      const blogsContainingPrivacy = _.filter(blogs, blog => blog.title.toLowerCase().includes('privacy'));
      const uniqueBlogTitles = _.uniq(_.map(blogs, 'title'));
      resolve({
        totalBlogs,
        longestBlog: longestBlog.title,
        blogsWithPrivacy: blogsContainingPrivacy.length,
        uniqueBlogTitles: uniqueBlogTitles
      });
    }).catch(error => {
      reject(error);
    });
  })
  return promise;
}

function result(query){
  console.log("Function called with query : " + query);
  const promise  = new Promise((resolve, reject) => {
    axios.get('https://intent-kit-16.hasura.app/api/rest/blogs', {
      headers: {
        'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6'
      }
    }).then(response => {
      const blogs = response.data.blogs;
      const filteredBlogs = _.filter(blogs, blog => blog.title.toLowerCase().includes(query.toLowerCase()));
      resolve( filteredBlogs);
    }) .catch(error => {
      reject(error);
    });
  })
 return promise;
}

var searchResult = _.memoize(result, searchResolver);
var analyticsResult = _.memoize(analytics, analyticResolver);

app.get('/api/blog-search', (req, res, next) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  searchResult(query)
  .then((result) => {
    res.json(result);
  }).catch((error) => {
    next(error);
  });
});

app.use('/api/blog-stats', (req, res, next) => {
  analyticsResult()
  .then((result) => {
    res.json(result);
  }).catch((error) => {
      next(error);
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
