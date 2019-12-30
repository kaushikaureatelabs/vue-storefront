import map from 'lodash-es/map'
import fetch from 'isomorphic-fetch'
import { slugify, processURLAddress } from '@vue-storefront/core/helpers'
import queryString from 'query-string'
import { currentStoreView, prepareStoreView } from '@vue-storefront/core/lib/multistore'
import { SearchQuery } from 'storefront-query-builder'
import HttpQuery from '@vue-storefront/core/types/search/HttpQuery'
import { SearchResponse } from '@vue-storefront/core/types/search/SearchResponse'
import config from 'config'
import getApiEndpointUrl from '@vue-storefront/core/helpers/getApiEndpointUrl';

export class SearchAdapter {
  public entities: any

  public constructor () {
    this.entities = []
    this.initBaseTypes()
  }

  public async search (Request) {
    const rawQueryObject = Request.searchQuery
    if (!this.entities[Request.type]) {
      throw new Error('No entity type registered for ' + Request.type)
    }
    if (!(Request.searchQuery instanceof SearchQuery)) {
      throw new Error('The only supported type of the "Request.searchQuery" is "SearchQuery"')
    }
    if (Request.hasOwnProperty('groupId') && Request.groupId !== null) {
      rawQueryObject['groupId'] = Request.groupId
    }
    if (Request.hasOwnProperty('groupToken') && Request.groupToken !== null) {
      rawQueryObject['groupToken'] = Request.groupToken
    }
    const storeView = (Request.store === null) ? currentStoreView() : await prepareStoreView(Request.store)
    Request.index = storeView.elasticsearch.index

    let url = processURLAddress(getApiEndpointUrl(storeView.elasticsearch, 'host'))

    if (this.entities[Request.type].url) {
      url = getApiEndpointUrl(this.entities[Request.type], 'url')
    }

    const httpQuery: HttpQuery = {
      size: Request.size,
      from: Request.from,
      sort: Request.sort,
      request_format: 'search-query',
      response_format: 'compact'
    }

    if (Request._sourceExclude) {
      httpQuery._source_exclude = Request._sourceExclude.join(',')
    }
    if (Request._sourceInclude) {
      httpQuery._source_include = Request._sourceInclude.join(',')
    }
    if (Request.q) {
      httpQuery.q = Request.q
    }

    if (!Request.index || !Request.type) {
      throw new Error('Query.index and Query.type are required arguments for executing ElasticSearch query')
    }
    if (config.elasticsearch.queryMethod === 'GET') {
      httpQuery.request = JSON.stringify(rawQueryObject)
    }
    url = url + '/' + encodeURIComponent(Request.index) + '/' + encodeURIComponent(Request.type) + '/_search'
    url = url + '?' + queryString.stringify(httpQuery)
    return fetch(url, { method: config.elasticsearch.queryMethod,
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: config.elasticsearch.queryMethod === 'POST' ? JSON.stringify(rawQueryObject) : null
    })
      .then(resp => { return resp.json() })
      .catch(error => {
        throw new Error('FetchError in request to API: ' + error.toString())
      })
  }

  public handleResult (resp, type, start = 0, size = 50): SearchResponse {
    if (resp === null) {
      throw new Error('Invalid API result - null not exepcted')
    }
    if (resp.hasOwnProperty('hits')) {
      return {
        items: map(resp.hits, hit => {
          return Object.assign(hit, { slug: hit.slug ? hit.slug : ((hit.hasOwnProperty('url_key') && config.products.useMagentoUrlKeys) ? hit.url_key : (hit.hasOwnProperty('name') ? slugify(hit.name) + '-' + hit.id : '')) }) // TODO: assign slugs server side
        }), // TODO: add scoring information
        total: resp.total,
        start: start,
        perPage: size,
        aggregations: resp.aggregations,
        suggestions: resp.suggest
      }
    } else {
      if (resp.error) {
        throw new Error(JSON.stringify(resp.error))
      } else {
        throw new Error('Unknown error with API catalog result in resultPorcessor for entity type \'' + type + '\'')
      }
    }
  }

  public registerEntityType (entityType, { url = '', url_ssr = '', queryProcessor, resultPorcessor }) {
    this.entities[entityType] = {
      queryProcessor: queryProcessor,
      resultPorcessor: resultPorcessor
    }
    if (url !== '') {
      this.entities[entityType]['url'] = url
    }
    if (url_ssr !== '') {
      this.entities[entityType]['url_ssr'] = url_ssr
    }
    return this
  }

  public initBaseTypes () {
    this.registerEntityType('product', {
      queryProcessor: (query) => {
        // function that can modify the query each time before it's being executed
        return query
      },
      resultPorcessor: (resp, start, size) => {
        return this.handleResult(resp, 'product', start, size)
      }
    })

    this.registerEntityType('attribute', {
      queryProcessor: (query) => {
        // function that can modify the query each time before it's being executed
        return query
      },
      resultPorcessor: (resp, start, size) => {
        return this.handleResult(resp, 'attribute', start, size)
      }
    })

    this.registerEntityType('category', {
      queryProcessor: (query) => {
        // function that can modify the query each time before it's being executed
        return query
      },
      resultPorcessor: (resp, start, size) => {
        return this.handleResult(resp, 'category', start, size)
      }
    })

    this.registerEntityType('taxrule', {
      queryProcessor: (query) => {
        // function that can modify the query each time before it's being executed
        return query
      },
      resultPorcessor: (resp, start, size) => {
        return this.handleResult(resp, 'taxrule', start, size)
      }
    })

    this.registerEntityType('review', {
      queryProcessor: (query) => {
        // function that can modify the query each time before it's being executed
        return query
      },
      resultPorcessor: (resp, start, size) => {
        return this.handleResult(resp, 'review', start, size)
      }
    })
    this.registerEntityType('cms_page', {
      queryProcessor: (query) => {
        // function that can modify the query each time before it's being executed
        return query
      },
      resultPorcessor: (resp, start, size) => {
        return this.handleResult(resp, 'cms_page', start, size)
      }
    })
    this.registerEntityType('cms_block', {
      queryProcessor: (query) => {
        // function that can modify the query each time before it's being executed
        return query
      },
      resultPorcessor: (resp, start, size) => {
        return this.handleResult(resp, 'cms_block', start, size)
      }
    })
    this.registerEntityType('cms_hierarchy', {
      queryProcessor: (query) => {
        // function that can modify the query each time before it's being executed
        return query
      },
      resultPorcessor: (resp, start, size) => {
        return this.handleResult(resp, 'cms_hierarchy', start, size)
      }
    })
  }
}
