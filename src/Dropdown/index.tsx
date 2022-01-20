import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Dimensions, FlatList,
  Image, Keyboard, Modal,
  Text, TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
  KeyboardEvent,
} from 'react-native';
import CInput from '../TextInput';
import { useDeviceOrientation } from '../useDeviceOrientation';
import { useDetectDevice } from '../utilsScale';
import { styles } from './styles';
import { DropdownProps } from './type';
import _ from 'lodash';

const { isTablet, isIOS } = useDetectDevice;
const ic_down = require('../assets/icon/down.png');

const defaultProps = {
  placeholder: 'Select item',
  activeColor: '#F6F7F8',
  data: [],
  style: {},
  selectedTextProps: {}
}

const DropdownComponent = React.forwardRef((props: DropdownProps, currentRef) => {
  const {
    onChange,
    style,
    containerStyle,
    placeholderStyle,
    selectedTextStyle,
    inputSearchStyle,
    iconStyle,
    selectedTextProps,
    data,
    labelField,
    valueField,
    value,
    activeColor,
    fontFamily,
    iconColor = "gray",
    searchPlaceholder,
    placeholder,
    search = false,
    searchFunction,
    maxHeight = 340,
    disable = false,
    renderLeftIcon,
    renderRightIcon,
    renderItem,
    renderInputSearch,
    onFocus,
    onBlur,
    autoScroll = true,
    showsVerticalScrollIndicator = true,
    dropdownPosition = 'auto',
    flatListProps,
    initialNumToRender,
    maxToRenderPerBatch,
  } = props;

  const orientation = useDeviceOrientation();
  const ref = useRef<View>(null);
  const refList = useRef<FlatList>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [currentValue, setCurrentValue] = useState<any>(null);
  const [position, setPosition] = useState<any>();
  const [focus, setFocus] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');

  const { width: W, height: H } = Dimensions.get('window');

  const styleContainerVertical: ViewStyle = { backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center' };
  const styleHorizontal: ViewStyle = { marginBottom: 20, width: W / 2, alignSelf: 'center' };

  const listData = React.useMemo(() => {
    if (disable || !Array.isArray(data) || !data?.length) return [];
    if (!searchText?.trim?.()) return data;

    const serialize = (text) => {
      return text
        ?.trim?.()
        ?.toLowerCase?.()
        ?.normalize?.('NFD')
        ?.replace?.(/[\u0300-\u036f]/g, '');
    };

    const defaultFilterFunction = e => {
      const item = _.get(e, labelField)?.toLowerCase().replace(' ', '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const key = searchText.toLowerCase().replace(' ', '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      return item.indexOf(key) >= 0
    }

    const propSearchFunction = e => {
      const labelText = _.get(e, labelField);
      return searchFunction?.(searchText, labelText);
    }

    const dataFilter = data.filter(searchFunction ? propSearchFunction : defaultFilterFunction);
    const wordsSearchText = searchText?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')?.split(' ') || [];

    const splitDataReducer = (str = '') => str?.split?.(' ')?.reduce?.((acc, act) => {
      return acc + wordsSearchText?.filter?.((word) => serialize(word) === serialize(act))?.length || 0
    }, 0);

    return dataFilter.sort((a,b) => {
      let countA = splitDataReducer(a);
      let countB = splitDataReducer(b);
  
      return countB - countA
    });
  }, [data, searchFunction, disable, searchText]);

  const font = React.useMemo(() => fontFamily ? { fontFamily } : {}, [fontFamily]);

  useImperativeHandle(currentRef, () => {
    return { open: eventOpen, close: eventClose };
  });

  const eventOpen = () => {
    if (disable) return;
    
    setVisible(true);
    onFocus?.();
  }

  const eventClose = () => {
    if (disable) return;

    setVisible(false);
    onBlur?.();
  }

  const onKeyboardDidShow = (e: KeyboardEvent) => {
    setKeyboardHeight(e.endCoordinates.height + (isIOS ? 0 : 50));
  };

  const onKeyboardDidHide = () => setKeyboardHeight(0);

  const showOrClose = () => {
    if (!disable) {
      _measure();
      setVisible(!visible);

      if (!visible) {
        if (onFocus) {
          onFocus();
        }
      } else {
        if (onBlur) {
          onBlur();
        }
      }
    }
    scrollIndex();
  };

  const scrollIndex = () => {
    if (!autoScroll) return;

    setTimeout(() => {
      if (!(refList && listData.length > 0)) return;

      const index = listData.findIndex(e => _.isEqual(value, _.get(e, valueField)));

      if (index > -1 && index <= listData.length - 1) {
        refList?.current?.scrollToIndex({ index: index, animated: false });
      }
    }, 200);
  };

  const onSelect = (item: any) => {
    setSearchText('');
    setCurrentValue((e: any) => e = item);
    onChange(item);
    eventClose();
  };

  const _renderDropdown = () => {
    const isSelected = currentValue && _.get(currentValue, valueField);

    return (
      <TouchableWithoutFeedback onPress={showOrClose}>
        <View style={styles.dropdown}>
          {renderLeftIcon?.()}
          <Text 
            style={[styles.textItem, isSelected !== null ? selectedTextStyle : placeholderStyle, font]} 
            {...selectedTextProps}
          >
            {isSelected !== null ? _.get(currentValue, labelField) : placeholder}
          </Text>
          {renderRightIcon ? renderRightIcon() : (
            <Image source={ic_down} style={[styles.icon, { tintColor: iconColor }, iconStyle]} />
          )}
        </View>
      </TouchableWithoutFeedback>
    )
  };

  const _renderItem = ({ item, index }: { item: any; index: number }) => {
    const isSelected = _.isEqual(_.get(item, valueField), currentValue && _.get(currentValue, valueField));

    return (
      <TouchableOpacity 
        key={index}
        onPress={() => onSelect(item)}
        style={[isSelected && { backgroundColor: activeColor }]}
      >
        {renderItem ? renderItem(item) : (
          <View style={styles.item}>
            <Text style={[styles.textItem, selectedTextStyle, font]}>{_.get(item, labelField)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSearch = () => {
    if (!search) return null;

    if (renderInputSearch) {
      return renderInputSearch((text) => { setSearchText(text) });
    }

    return (
      <CInput
        style={[styles.input, inputSearchStyle]}
        inputStyle={[inputSearchStyle, font]}
        autoCorrect={false}
        keyboardType={isIOS ? 'default' : 'visible-password'}
        placeholder={searchPlaceholder}
        onChangeText={setSearchText}
        placeholderTextColor="gray"
        iconStyle={[{ tintColor: iconColor }, iconStyle]}
        onFocus={() => setFocus(true)}
        onBlur={() => { setFocus(false) }}
      />
    )
  }

  const _renderListTop = () => {
    return (
      <View style={{ flex: 1 }}>
        <FlatList
          {...flatListProps}
          keyboardShouldPersistTaps="handled"
          ref={refList}
          onScrollToIndexFailed={scrollIndex}
          data={listData}
          inverted
          renderItem={_renderItem}
          keyExtractor={(_, index) => index.toString()}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          initialNumToRender={initialNumToRender}
          maxToRenderPerBatch={maxToRenderPerBatch}
        />
        {renderSearch()}
      </View>
    )
  };

  const _renderListBottom = () => {
    return (
      <View style={{ flex: 1 }}>
        {renderSearch()}
        <FlatList
          {...flatListProps}
          keyboardShouldPersistTaps="handled"
          ref={refList}
          onScrollToIndexFailed={scrollIndex}
          data={listData}
          renderItem={_renderItem}
          keyExtractor={(_, index) => index.toString()}
          initialNumToRender={initialNumToRender}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          maxToRenderPerBatch={maxToRenderPerBatch}
        />
      </View>
    )
  };

  const _renderModal = useCallback(() => {
    if (!visible || !position) return null;
    if (!position?.w || !position?.top || !position?.bottom) return null;
    
    const { isFull, top, bottom, left, height, w: width } = position;

    const keyboardStyle: ViewStyle = { backgroundColor: 'rgba(0,0,0,0.1)' };
    const styleVertical: ViewStyle = { left: left, maxHeight: maxHeight };
    const styleByOrientation = isFull ? styleHorizontal : styleVertical;

    const isTopPosition = dropdownPosition === 'auto' ? bottom < (isIOS ? 200 : 300) : dropdownPosition === 'top';
    
    let topHeight = isTopPosition ? top - height : top;

    if (
        (renderInputSearch && keyboardHeight > 0 && bottom < keyboardHeight + height) ||
        (focus && keyboardHeight > 0 && bottom < keyboardHeight + height)
      ) {
      if (
        (keyboardHeight > 0 && bottom < keyboardHeight + height) || 
        (focus && keyboardHeight > 0 && bottom < keyboardHeight + height)
      ) {
        if (isTopPosition) topHeight = H - keyboardHeight;
        else topHeight = H - keyboardHeight - 55;
      }
    }

    return (
      <Modal transparent visible={visible} supportedOrientations={['landscape', 'portrait']}>
        <TouchableWithoutFeedback onPress={showOrClose}>
          <View style={[{ flex: 1 }, keyboardStyle, isFull && styleContainerVertical]}>
            <View style={{ height: topHeight, width, justifyContent: 'flex-end' }}>
              {isTopPosition && (
                <View style={[{ width }, styles.container, containerStyle, styleByOrientation]}>
                  {_renderListTop()}
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              {!isTopPosition && (
                <View style={[{ width }, styles.container, containerStyle, styleByOrientation]}>
                  {_renderListBottom()}
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }, [focus, position, visible, keyboardHeight, listData, value]);

  const _measure = () => {
    if (!ref) return;

    ref.current.measure((width, height, px, py, fx, fy) => {
      const isFull = orientation === 'LANDSCAPE' && !isTablet;
      const w = parseInt(px);
      const top = isFull ? 20 : parseInt(py) + parseInt(fy) + 2;
      const bottom = H - top;
      const left = parseInt(fx);

      setPosition({
        isFull,
        w,
        top,
        bottom: parseInt(bottom + ''),
        left,
        height: parseInt(py)
      });
    });
  };

  // update value
  useEffect(() => {
    const getItem = data.filter(e => _.isEqual(value, _.get(e, valueField)));
    getItem.length ? setCurrentValue((e: any) => e = getItem[0]) : setCurrentValue(null);
  }, [value, data]);

  useEffect(() => {
    const susbcriptionKeyboardDidShow = Keyboard.addListener('keyboardDidShow', onKeyboardDidShow);
    const susbcriptionKeyboardDidHide = Keyboard.addListener('keyboardDidHide', onKeyboardDidHide);

    return () => {
      if (susbcriptionKeyboardDidShow?.remove) {
        susbcriptionKeyboardDidShow.remove();
      } else {
        Keyboard.removeListener('keyboardDidShow', onKeyboardDidShow);
      }

      if (susbcriptionKeyboardDidHide?.remove) {
        susbcriptionKeyboardDidHide.remove();
      } else {
        Keyboard.removeListener('keyboardDidHide', onKeyboardDidHide);
      }
    }
  }, []);

  return (
    <View style={[{ justifyContent: 'center' }, style]} ref={ref} onLayout={_measure}>
      {_renderDropdown()}
      {_renderModal()}
    </View>
  );
});

DropdownComponent.defaultProps = defaultProps;

export default DropdownComponent;

