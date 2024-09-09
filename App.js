import { StatusBar } from 'expo-status-bar';
import React, {useState, useEffect} from 'react';
import { StyleSheet, Text, View, Button, Image, TextInput, SafeAreaView, FlatList, SectionList, ActivityIndicator, TouchableOpacity, Modal, Dimensions} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Cell } from 'react-native-tableview-simple';
import ImageViewer from 'react-native-image-zoom-viewer';
import ReadMore from '@fawazahmed/react-native-read-more';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialIcons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAllFavourites, getArtIDsWithTasks, toggleFavourite, addTask, deleteTask, getTasksByArtID, isSavedFavourite, markTaskCompleted } from './storage.js';
import {addCalEvent, deleteCalEvent} from './calendar.js';

// get window width
 const ITEM_WIDTH = Dimensions.get('window').width;
 const ITEM_HEIGHT = Dimensions.get('window').height;

/*  main function */
export default function App() {
 const Stack = createStackNavigator();

  /* request calendar sync permission */
  useEffect(() => {
    (async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted')  {
        alert('Calender access was denied. Tasks will not be added to your local calendar.')
      }
    })();
  }, []);

  /* stack of screens */
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name='Browse' component={BrowseScreen} />
        <Stack.Screen name='Favourites' component={FavouritesScreen} />
        <Stack.Screen name='Tasks' component={TaskListScreen} />
        <Stack.Screen name='Detail' component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* call public API for retreive image of art by id */
const getImageURL = (image_id) => {

  return "https://www.artic.edu/iiif/2/" + image_id + "/full/843,/0/default.jpg";
  // 843 is image size
}

/* list screen to browse artworks */
function BrowseScreen({ navigation }) {

  let listViewRef;
  const [list, setList] = useState(); 

  /* call public API and set results */
  const makeCallForFullList= async () => {
    try {
      /* get romdom page number to browse. page 50 is the last */
      let pageNum = Math.floor(Math.random() * (51 - 1) + 1);
      /* call public API with filtering */
      let response = await fetch(
        'https://api.artic.edu/api/v1/artworks/search?params={"query":{"bool":{"filter":[{"term":{"is_public_domain":"true"}},{"exists":{"field":"image_id"}}]}}}&page=' +pageNum+ '&limit=20&fields=id,title,image_id',
      );
      let json = await response.json();
      setList(json);
      console.log('page: ' + pageNum);
    } catch (error) {
      console.error(error);
    }
  };

  /* make call on screen load */ 
  useEffect(() => {
      makeCallForFullList();
  }, []);

  /* when data load failed*/ 
  if (list == undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator />
        <Button title="relaod" onPress={() => makeCallForFullList()} />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  } else {
    /* when data loaded */ 
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          keyExtractor={(item) => item.id}
          data={list.data}
          ref={(ref) => {listViewRef = ref;}}
          renderItem={itemData => (
            <ArtCell 
              titleText={itemData.item.title}
              image_id={itemData.item.image_id}
              imageURL={getImageURL(itemData.item.image_id)}
              action={() => {
                  navigation.navigate('Detail', {
                    artId: itemData.item.id,
                  });
                }}
            /> 
          )}
          ListEmptyComponent={<Text>{"Sorry! Something happend.\nPlease reload again"}</Text>}
        />
        <View style={styles.bottomMenu}>
          <MaterialIcons name='refresh' 
            size={25}
            onPress={async() => {await makeCallForFullList().then(listViewRef.scrollToOffset({offset:0, animated: true}))}} />
          <TouchableOpacity onPress={() => navigation.navigate("Favourites")}>
            <Text style={styles.menuButton}>saved</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Tasks")}>
            <Text style={styles.menuButton}>tasks</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }
}

/* list screen of artworks saved as favourites */
function FavouritesScreen({ navigation }) {
  const [favList, setFavList] = useState(); 

  /* call api to retreive artwork titles and images */
  const makeCallForFavList= async () => {
    try {

      const response = await getAllFavourites().then(artIds => { 
        return fetch(
          'https://api.artic.edu/api/v1/artworks?ids='+ artIds +'&fields=id,title,image_id');
      });

      let json = await response.json();
      setFavList(json.data);
    } catch (error) {
      console.error(error);
    }
  };

  /* make call on screen load */ 
  useEffect(() => {
    const willFocusSubscription = navigation.addListener('focus', () => {
      makeCallForFavList();
    });
    return willFocusSubscription;
  }, []);

  /* wnen no artworks to show */ 
  if (favList == undefined || favList == null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>{"No artworks saved yet.\nLet's save your favourites!"}</Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  } else {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          keyExtractor={(item, index) => item.id}
          data={favList}
          renderItem={itemData => (
            <ArtCell 
              titleText={itemData.item.title}
              image_id={itemData.item.image_id}
              imageURL={getImageURL(itemData.item.image_id)}
              action={() => {
                  navigation.navigate('Detail', {
                    artId: itemData.item.id,
                  });
                }}
            /> 
          )}
          ListEmptyComponent={<Text>{"No artworks saved yet.\nLet's save your favourites!"}</Text>}
        />        
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }
}

/* custom list cell for art image  */ 
const ArtCell = (props) => (
  <Cell
    {...props}
    backgroundColor="transparent"
    highlightUnderlayColor="#ccc"
    onPress={props.action}
    cellContentView={
      <View style={styles.artCell}>
        <Image
          style={styles.artImageInCell}
          source={{uri: props.imageURL}}
        />
        <Text style={{fontSize: 15}}> {props.titleText} </Text>
      </View>
    }
  />
) 

/* detail art info screen, when artwork is selected from list */ 
function DetailScreen({ route, navigation }) {

  const artId = route.params.artId;
  
  const [artInfo, setArtInfo] = useState();
  const [tasks, setTasks] = useState([]);
  const [text, onChangeText] = useState();
  const [datetime, setDatetime] = useState(new Date());
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [isFavourite, setIsFavourite] = useState('false'); 

  /* artwork image info */ 
  const images = [
      {
          url: getImageURL(artInfo?.data.image_id),
          width: artInfo?.data.thumbnail.width,
          height: artInfo?.data.thumbnail.height,
      },
  ];

  /* event on chage datetime picker */ 
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate;
    setDatetime(currentDate);
  };

  /* call api to fetch art detail info json */ 
  const makeCallForDetail= async (artId) => {
    try {
      const response = await fetch(
        "https://api.artic.edu/api/v1/artworks/" + artId + "?fields=id,title,thumbnail,date_display,description,image_id,artist_display,place_of_origin"
      );
      const json = await response.json();
      setArtInfo(json);

      let isFav = await isSavedFavourite(String(artId));
      setIsFavourite(isFav);

      await getTasksByArtID(String(artId)).then(savedTasks => { 
        setTasks(savedTasks);
      });

    } catch (error) {
      console.error(error);
    }
  };

  /* make call on screen load */ 
  useEffect(() => {
      makeCallForDetail(artId);
  }, [artId]);

  /* when data load failed*/ 
  if (artInfo == undefined) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <StatusBar style="auto" />
      </View>
    );

  } else {
    /* when data loaded */ 
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAwareScrollView>
          <TouchableOpacity onPress={() => setIsImageViewVisible(true)} >
            <Image
              style={styles.artImageInDetailScreen}
              source={{uri:getImageURL(artInfo.data.image_id)}}
            />          
          </TouchableOpacity>
          <Modal visible={isImageViewVisible}
                transparent={true}
                saveToLocalByLongPress={false}
                onRequestClose={() => setIsImageViewVisible(false)}>    
              <ImageViewer imageUrls={images} />
              <Button
                onPress={() => setIsImageViewVisible(false)}
                title="Close">
            </Button>
          </Modal>          
          <View style={styles.txtAreaInDetailScreen}>
            <View style={styles.rowContainer}>
              <Text style={styles.titleTxt}>{artInfo.data.title} </Text>
              <MaterialIcons name={isFavourite ==='true' ? 'favorite' : 'favorite-border'} 
              color='mediumvioletred'
              size={22}
              onPress={async() => setIsFavourite(await toggleFavourite(String(artId)))}/>
            </View>    
            
            <View style={styles.artInfoTxt}>
              <Text>Artist: {artInfo.data.artist_display}</Text>
              <Text>Date: {artInfo.data.date_display}</Text>                         
              <Text>Place of Origin: {artInfo.data.place_of_origin} </Text>
              <Text>{"\n"}</Text> 
              <ReadMore numberOfLines={2} seeMoreStyle={styles.seeMoreTxt} seeLessStyle={styles.seeMoreTxt}>
                <Text>{artInfo.data.description?.replace(/<\/?[^>]+(>|$)/g, "")}</Text> 
              </ReadMore>
            </View>
            
            <Text style={styles.titleTxt}>Your Tasks</Text>  
            
            <TextInput
              style={styles.input}
              onChangeText={onChangeText}
              value={text}
              placeholder={"type your new task..."}
              placeholderTextColor="black"
            />
            <View style={styles.rowContainer}>
              <Text>Due date:</Text>
              <DateTimePicker
                value={datetime}
                mode="datetime"
                is24Hour={true}
                onChange={onChangeDate}
                themeVariant="light"
              />
            </View>
            <Button title="add task" disabled={text == undefined || text.trim() === ""  ? true : false} 
              onPress={async() => {setTasks(await addTask(String(artId),  (await addCalEvent(text, datetime)), text, datetime.toLocaleString())); onChangeText('');}} />
            <FlatList
              keyExtractor={(item, index) => item.taskID}
              data={tasks}
              renderItem={itemData => (
                <TaskCell
                  artId={artId}
                  taskID={itemData.item.taskID}
                  taskText={itemData.item.text}
                  dueDate={itemData.item.dueDate}     
                  isCompleted={itemData.item.isCompleted}
                  compTaskAction={async()=>{await markTaskCompleted(itemData.item.taskID); setTasks(await getTasksByArtID(String(artId))); deleteCalEvent(itemData.item.taskID);}}
                  deleteTaskAction={async() => {setTasks(await deleteTask(String(artId), itemData.item.taskID)); deleteCalEvent(itemData.item.taskID);}}
                />
              )}
              ListEmptyComponent={<Text>{"No tasks saved yet.\nLet's create your first one!"}</Text>}
            />
          </View>   
        </KeyboardAwareScrollView> 
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }
}

/* list screen of artworks saved with user tasks */
function TaskListScreen({ navigation }) {
  const [taskList, setTaskList] = useState();

  /* call api to retreive artwork titles and images */
  const makeCallForTaskList= async () => {
    try {
      const response = await getArtIDsWithTasks().then(artIds => { 
        return fetch(
          'https://api.artic.edu/api/v1/artworks?ids='+ artIds + '&fields=id,title,image_id');
      });

      let json = await response.json();

      // get artworks and their tasks
      const artWithUncompTasks = await Promise.all(
        Object.values(json.data)
          .map(async (item) => {
            let tasks = await getTasksByArtID(String(item.id));
            let uncompTasks = tasks ? tasks.filter(task => task.isCompleted === 'false') : [];

            if (uncompTasks.length == 0) {
              return null;
            }

            item.data = uncompTasks;
            return item;
          })
      );

      // filter artworkds with uncompleted tasks 
      json.data = artWithUncompTasks.filter(art => art !== null);

      setTaskList(json.data);
      return json.data;
    
    } catch (error) {
      console.error(error);
    }
  };

  /* make call on screen load */ 
useEffect(() => {
    const willFocusSubscription = navigation.addListener('focus', () => {
      makeCallForTaskList();
    });
    return willFocusSubscription;
  }, []);

  /* wnen no artworks to show */ 
  if (taskList == undefined || taskList == "") {
    return (
      <SafeAreaView style={styles.container}>
        <Text>{"No tasks saved yet.\nLet's save your first task!"}</Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    );

  } else {
    return (
      <SafeAreaView style={styles.container}>
        <SectionList
          sections={taskList}
          keyExtractor={(item, index) => item + index}
          stickySectionHeadersEnabled={false}
          renderItem={({item, section})=> (
            <View>
              <TaskCell
                taskText={item.text}
                dueDate={item.dueDate}     
                isCompleted={item.isCompleted}
                compTaskAction={async()=>{await markTaskCompleted(item.taskID); setTaskList(await makeCallForTaskList()); deleteCalEvent(item.taskID);}}
                deleteTaskAction={async() => {await deleteTask(String(section.id), item.taskID).then(setTaskList(await makeCallForTaskList())); deleteCalEvent(item.taskID);}}
              />
            </View>
          )}
          renderSectionHeader={({section: {id, title, image_id}}) => (
            <Cell
              backgroundColor="transparent"
              highlightUnderlayColor="#ccc"
              onPress={() => {
                navigation.navigate('Detail', {
                  artId: id,
                });
              }}
              cellContentView={
                <View style={styles.artCell}>
                  <View style={styles.separator}></View>
                  <Image
                    style={styles.imageInTaskScreenCell}
                    source={{uri: getImageURL(image_id)}}
                  />
                  <Text> {title} </Text>
                </View>
              }
            />
          )}

          ListEmptyComponent={<Text>{"No tasks saved yet.\nLet's save your first task!"}</Text>}
        />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }
}

/* custom list cell for tasks  */ 
const TaskCell = (props) => (
  <Cell
    {...props}
    backgroundColor="transparent"
    highlightUnderlayColor="#ccc"
    onPress={props.cellAction}
    cellContentView={
      <View style={styles.taskCell}>
        <View style={styles.iconArea}>
          <MaterialIcons name={props.isCompleted ==='true' ? 'check-box' : 'check-box-outline-blank'} 
            color={props.isCompleted ==='true' ? 'seagreen' : 'darkslategray'} 
            size={25}
            onPress={props.compTaskAction} />
        </View>
        <View style={styles.taskText}>
          <Text>{props.taskText}</Text>
          <Text>Due: {props.dueDate}</Text>
        </View>
        <View style={styles.iconArea}>
          <MaterialIcons name='delete-forever'
            color='darkslategray'
            size={25}
            onPress={props.deleteTaskAction} />                  
        </View>
      </View>     
    }
  />
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  bottomMenu: {
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'row', 
    width: ITEM_WIDTH * 0.6,
    height: 60,
    position: 'absolute', 
    top: ITEM_HEIGHT-180, 
    zIndex: 3,
    borderWidth: 1,
    borderRadius: 80,
    backgroundColor: 'white',
  },

  menuButton: {
    fontSize: 17,
  },

  artCell: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },

  imageInTaskScreenCell: {
    width: ITEM_WIDTH * 0.9,
    height: ITEM_WIDTH * 0.2,
    resizeMode: 'cover',
    marginTop: 25,
  },

  separator: {
    width: ITEM_WIDTH * 0.9,
    height: 2,
    backgroundColor: 'silver',
  },

  artImageInCell: {
    width: ITEM_WIDTH * 0.9,
    height: ITEM_WIDTH * 0.9,
    resizeMode: 'contain',
  },

  artImageInDetailScreen: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    resizeMode: 'contain',
  },

  /* bottom half of detail screen */
  txtAreaInDetailScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'linen',
    padding: ITEM_WIDTH * 0.05,
  },

  artInfoTxt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },

  taskCell: {
    flexDirection: 'row',
    width: ITEM_WIDTH * 0.9,
    height: 70,
    borderTopWidth: 1,
    paddingTop: 10,
    backgroundColor: 'linen',
  },

  iconArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },

  taskText: {
    flex: 6,
    alignItems: 'start',
    justifyContent: 'center',
  },

  /* textinput field */ 
  input: {
    width: '100%',
    height: 80,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },

  titleTxt: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 5,
    width: '90%',
    textAlign: 'center',
  },

  seeMoreTxt: {
    color: 'royalblue',
    fontWeight: 'bold',
  },
});
