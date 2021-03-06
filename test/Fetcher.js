/* global describe, it */

const assert = require('assert')
const fs = require('fs')
const nock = require('nock')
const rdf = require('rdf-ext')
const url = require('url')
const Fetcher = require('../lib/Fetcher')

describe('Fetcher', () => {
  const fileUrlDataset = 'file://' + require.resolve('tbbt-ld/dist/tbbt.nq')

  describe('.isCached', () => {
    it('should be a method', () => {
      assert.equal(typeof Fetcher.isCached, 'function')
    })

    it('should return false if caching is not enabled', () => {
      assert(!Fetcher.isCached({}))
    })

    it('should return false if caching is enabled but fetched date is not set', () => {
      assert(!Fetcher.isCached({cache: true}))
    })

    it('should return true if caching is enabled and fetched date is set', () => {
      assert(Fetcher.isCached({
        cache: true,
        fetched: new Date()
      }))
    })
  })

  describe('.fetchDataset', () => {
    it('should be a method', () => {
      assert.equal(typeof Fetcher.fetchDataset, 'function')
    })

    it('should load a dataset from a file URL', () => {
      const options = {
        url: fileUrlDataset,
        options: {
          contentTypeLookup: () => {
            return 'application/n-quads'
          }
        }
      }

      return Fetcher.fetchDataset(options).then((dataset) => {
        const graphs = dataset.toArray().reduce((graphs, quad) => {
          graphs[quad.graph.value] = true

          return graphs
        }, {})

        assert(graphs['http://localhost:8080/data/person/amy-farrah-fowler'])
        assert(graphs['http://localhost:8080/data/person/sheldon-cooper'])
      })
    })

    it('should load a dataset from a http URL', () => {
      const content = fs.readFileSync(url.parse(fileUrlDataset).path)

      nock('http://example.org').get('/dataset').reply(200, content, {
        'content-type': 'application/n-quads'
      })

      const options = {
        url: 'http://example.org/dataset'
      }

      return Fetcher.fetchDataset(options).then((dataset) => {
        const graphs = dataset.toArray().reduce((graphs, quad) => {
          graphs[quad.graph.value] = true

          return graphs
        }, {})

        assert(graphs['http://localhost:8080/data/person/amy-farrah-fowler'])
        assert(graphs['http://localhost:8080/data/person/sheldon-cooper'])
      })
    })

    it('should load a dataset from a http URL and use the given content type to parse it', () => {
      const content = fs.readFileSync(url.parse(fileUrlDataset).path)

      nock('http://example.org').get('/dataset-content-type').reply(200, content)

      const options = {
        url: 'http://example.org/dataset-content-type',
        contentType: 'application/n-quads'
      }

      return Fetcher.fetchDataset(options).then((dataset) => {
        const graphs = dataset.toArray().reduce((graphs, quad) => {
          graphs[quad.graph.value] = true

          return graphs
        }, {})

        assert(graphs['http://localhost:8080/data/person/amy-farrah-fowler'])
        assert(graphs['http://localhost:8080/data/person/sheldon-cooper'])
      })
    })
  })

  describe('.spreadDataset', () => {
    it('should be a method', () => {
      assert.equal(typeof Fetcher.spreadDataset, 'function')
    })

    it('should forward the dataset if no options are given', () => {
      const input = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/subject1'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/graph')),
        rdf.quad(
          rdf.namedNode('http://example.org/subject2'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/graph'))
      ])

      const output = rdf.dataset()

      Fetcher.spreadDataset(input, output, {})

      assert.equal(output.toCanonical(), input.toCanonical())
    })

    it('should load the triples into the given named node if resource is set', () => {
      const resource = 'http://example.org/resource'

      const input = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/subject1'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/graph')),
        rdf.quad(
          rdf.namedNode('http://example.org/subject2'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/graph'))
      ])

      const output = rdf.dataset()

      const expected = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/subject1'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode(resource)),
        rdf.quad(
          rdf.namedNode('http://example.org/subject2'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode(resource))
      ])

      Fetcher.spreadDataset(input, output, {resource: resource})

      assert.equal(output.toCanonical(), expected.toCanonical())
    })

    it('should split the dataset if split option is true', () => {
      const input = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/subject1'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/graph')),
        rdf.quad(
          rdf.namedNode('http://example.org/subject2'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/graph'))
      ])

      const output = rdf.dataset()

      const expected = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/subject1'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/subject1')),
        rdf.quad(
          rdf.namedNode('http://example.org/subject2'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/subject2'))
      ])

      Fetcher.spreadDataset(input, output, {split: true})

      assert.equal(output.toCanonical(), expected.toCanonical())
    })

    it('should assign an array of all resources to the options object', () => {
      const input = rdf.dataset([
        rdf.quad(
          rdf.namedNode('http://example.org/subject1'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/graph1')),
        rdf.quad(
          rdf.namedNode('http://example.org/subject2'),
          rdf.namedNode('http://example.org/predicate'),
          rdf.literal('object'),
          rdf.namedNode('http://example.org/graph2'))
      ])

      const output = rdf.dataset()

      const options = {}

      Fetcher.spreadDataset(input, output, options)

      assert.deepEqual(options.resources, [
        'http://example.org/graph1',
        'http://example.org/graph2'
      ])
    })
  })
})
