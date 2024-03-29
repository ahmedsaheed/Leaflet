import CommandPalette, { filterItems, getItemIndex, JsonStructureItem } from 'react-cmdk'
import { shell } from 'electron'
import path from 'path'
import { Cmdkfooter } from './cmdk-footer'
export function CMDK({
  onFileSelect,
  onNewFile,
  onCreatingFolder,
  files,
  search,
  setSearch,
  setClick,
  menuOpen,
  page,
}) {
  const filteredItems = items(
    onFileSelect,
    onNewFile,
    onCreatingFolder,
    files,
    search,
  )
  return (
    <CommandPalette
      onChangeSearch={setSearch}
      onChangeOpen={setClick}
      search={search}
      isOpen={menuOpen}
      page={page}
      placeholder={`Search ${files.flat().length} notes...`}
      footer={<Cmdkfooter />}
    >
      <CommandPalette.Page id='root'>
        {filteredItems.length ? (
          filteredItems.map((list) => (
            <CommandPalette.List key={list.id} heading={list.heading}>
              {list.items.map(({ id, ...rest }) => (
                <CommandPalette.ListItem
                  showType={false}
                  key={id}
                  index={getItemIndex(filteredItems, id)}
                  {...rest}
                />
              ))}
            </CommandPalette.List>
          ))
        ) : (
          <CommandPalette.FreeSearchAction />
        )}
      </CommandPalette.Page>
    </CommandPalette>
  )
}

const capitalize = (s: string) => {
  if (typeof s !== 'string') return ''
  const words = s.split(' ')

  for (let i = 0; i < words.length; i++) {
    words[i] = words[i][0].toUpperCase() + words[i].substring(1) + ' '
  }
  words.join(' ')

  return words
}

type FileType = {
  name: string
  path: string
}

function items(
  onFileSelect: (file: any) => any,
  onNewFile: () => any,
  onCreatingFolder: () => any,
  files: Array<FileType>,
  search: string,
) {
  function mapItems(files: Array<FileType>) : Array<JsonStructureItem> {
    return [
      ...files.map((file) => ({
        id: file.name,
        showType: false,
        children: file.name,
        // (
        //   <p>
        //     {file.name} —{' '}
        //     <span style={{ fontSize: '12px', color: '#888888' }}>
        //       {capitalize(path.basename(path.dirname(file.path)).toLowerCase())}
        //     </span>
        //   </p>
        // ),
        icon: 'DocumentTextIcon',
        onClick: () => {
          onFileSelect(file)
        }
      }))
    ] as JsonStructureItem[]
  }
  const filteredItems = filterItems(
    [
      {
        heading: 'General',
        id: 'general',
        items: [
          {
            id: 'new',
            children: 'New File',
            icon: 'NewspaperIcon',
            showType: false,
            onClick: () => {
              onNewFile()
            }
          },
          {
            id: 'folder',
            children: 'New Folder',
            icon: 'FolderOpenIcon',
            showType: false,
            onClick: () => {
              onCreatingFolder()
            }
          },
        ]
      },
      {
        heading: 'Files',
        id: 'files',
        items: mapItems(files)
      },
      {
        heading: 'Help',
        id: 'advanced',
        items: [
          {
            id: 'keys',
            showType: false,
            children: 'Keyboard Shortcuts',
            icon: 'KeyIcon',
            onClick: (event: React.MouseEvent<HTMLElement>) => {
              event.preventDefault()
              shell.openExternal(
                'https://github.com/ahmedsaheed/Leaflet#shortcuts-and-controls'
              )
            }
          },
          {
            id: 'help',
            showType: false,
            children: 'Help & Documentation',
            icon: 'QuestionMarkCircleIcon',
            onClick: (event: React.MouseEvent<HTMLElement>) => {
              event.preventDefault()
              shell.openExternal('https://github.com/ahmedsaheed/Leaflet')
            }
          }
        ]
      }
    ],
    search
  )

  return filteredItems
}
